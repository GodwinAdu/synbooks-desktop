/**
 * Local Job Scheduler
 * 
 * Runs background jobs locally (replaces the cloud cron jobs).
 * Uses node-cron for scheduling.
 */

import cron from 'node-cron';
import { getDB, dbAll, dbGet, saveToDisk } from '../database';
import log from 'electron-log';

let tasks: cron.ScheduledTask[] = [];

export function startScheduler(): void {
  log.info('Starting local job scheduler...');

  // Every hour: check overdue invoices/bills
  tasks.push(cron.schedule('0 * * * *', () => {
    try { processOverdueInvoices(); } catch (e) { log.error('Overdue invoices job failed:', e); }
  }));

  tasks.push(cron.schedule('0 * * * *', () => {
    try { processOverdueBills(); } catch (e) { log.error('Overdue bills job failed:', e); }
  }));

  // Every 6 hours: check low stock
  tasks.push(cron.schedule('0 */6 * * *', () => {
    try { checkLowStock(); } catch (e) { log.error('Low stock job failed:', e); }
  }));

  // Daily at midnight: budget variance + recurring invoices
  tasks.push(cron.schedule('0 0 * * *', () => {
    try { checkBudgetVariance(); } catch (e) { log.error('Budget variance job failed:', e); }
  }));

  tasks.push(cron.schedule('0 0 * * *', () => {
    try { generateRecurringInvoices(); } catch (e) { log.error('Recurring invoices job failed:', e); }
  }));

  tasks.push(cron.schedule('0 0 * * *', () => {
    try { generateRecurringExpenses(); } catch (e) { log.error('Recurring expenses job failed:', e); }
  }));

  // Daily: generate invoices from active contracts
  tasks.push(cron.schedule('0 1 * * *', () => {
    try { generateContractInvoices(); } catch (e) { log.error('Contract invoicing job failed:', e); }
  }));

  // Also run recurring invoices/expenses on startup (in case app was closed when they were due)
  setTimeout(() => {
    try { generateRecurringInvoices(); } catch (e) { log.error('Recurring invoices startup check failed:', e); }
    try { generateRecurringExpenses(); } catch (e) { log.error('Recurring expenses startup check failed:', e); }
    try { generateContractInvoices(); } catch (e) { log.error('Contract invoicing startup check failed:', e); }
  }, 5000);

  log.info(`Scheduler started with ${tasks.length} jobs`);
}

export function stopScheduler(): void {
  tasks.forEach(t => t.stop());
  tasks = [];
  log.info('Scheduler stopped');
}

function processOverdueInvoices(): void {
  const db = getDB();
  const now = new Date().toISOString();
  db.run(
    `UPDATE invoices SET status = 'overdue', updatedAt = ?, _dirty = 1 WHERE status = 'sent' AND dueDate < ? AND del_flag = 0`,
    [now, now]
  );
  saveToDisk();
}

function processOverdueBills(): void {
  const db = getDB();
  const now = new Date().toISOString();
  db.run(
    `UPDATE bills SET status = 'overdue', updatedAt = ?, _dirty = 1 WHERE status IN ('draft', 'pending', 'sent') AND dueDate < ? AND del_flag = 0`,
    [now, now]
  );
  saveToDisk();
}

function checkLowStock(): void {
  const lowStockProducts = dbAll(
    `SELECT id, name, sku, currentStock, reorderLevel FROM products WHERE del_flag = 0 AND trackInventory = 1 AND status = 'active' AND currentStock <= reorderLevel`
  );

  if (lowStockProducts.length > 0) {
    log.info(`Low stock alert: ${lowStockProducts.length} products below reorder level`);
  }
}

function checkBudgetVariance(): void {
  const budgets = dbAll(`SELECT * FROM budgets WHERE del_flag = 0 AND status = 'active'`);

  for (const budget of budgets) {
    if (budget.totalBudget > 0 && budget.totalActual > budget.totalBudget * 0.9) {
      log.warn(`Budget "${budget.name}" at ${Math.round((budget.totalActual / budget.totalBudget) * 100)}% utilization`);
    }
  }
}

/**
 * Generate invoices from recurring templates where nextRunDate <= today
 */
function generateRecurringInvoices(): void {
  const db = getDB();
  const today = new Date().toISOString().split('T')[0];

  // Find active recurring templates that are due
  const templates = dbAll(
    `SELECT * FROM recurring_invoices WHERE del_flag = 0 AND isActive = 1 AND nextRunDate <= ?`,
    [today]
  );

  if (templates.length === 0) return;

  let generated = 0;

  for (const template of templates) {
    try {
      // Parse line items
      let lineItems = [];
      try {
        lineItems = typeof template.lineItems === 'string' ? JSON.parse(template.lineItems) : (template.lineItems || []);
      } catch {}

      // Count existing invoices to generate number
      const countResult = dbGet(`SELECT COUNT(*) as count FROM invoices WHERE organizationId = ?`, [template.organizationId]);
      const invoiceNumber = `INV-${String((countResult?.count || 0) + 1).padStart(5, '0')}`;

      // Calculate due date (30 days from now)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const now = new Date().toISOString();
      const id = require('crypto').randomUUID();

      // Create draft invoice
      db.run(
        `INSERT INTO invoices (id, organizationId, invoiceNumber, customerId, invoiceDate, dueDate, lineItems, subtotal, taxAmount, totalAmount, paidAmount, status, notes, del_flag, createdBy, createdAt, updatedAt, _dirty, _syncVersion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'draft', ?, 0, 'system', ?, ?, 1, 0)`,
        [
          id,
          template.organizationId,
          invoiceNumber,
          template.customerId || null,
          today,
          dueDate.toISOString().split('T')[0],
          typeof lineItems === 'string' ? lineItems : JSON.stringify(lineItems),
          template.subtotal || template.totalAmount || 0,
          template.taxAmount || 0,
          template.totalAmount || 0,
          `Auto-generated from recurring template: ${template.profileName || template.templateName || ''}`,
          now,
          now,
        ]
      );

      // Update the template's nextRunDate based on frequency
      const nextDate = calculateNextRunDate(template.nextRunDate || today, template.frequency);
      db.run(
        `UPDATE recurring_invoices SET nextRunDate = ?, lastGeneratedAt = ?, updatedAt = ?, _dirty = 1 WHERE id = ?`,
        [nextDate, now, now, template.id]
      );

      // If endDate is set and next date exceeds it, deactivate
      if (template.endDate && nextDate > template.endDate) {
        db.run(`UPDATE recurring_invoices SET isActive = 0, updatedAt = ?, _dirty = 1 WHERE id = ?`, [now, template.id]);
      }

      generated++;
    } catch (err) {
      log.error(`Failed to generate invoice from recurring template ${template.id}:`, err);
    }
  }

  if (generated > 0) {
    saveToDisk();
    log.info(`[Recurring] Generated ${generated} draft invoice(s) from recurring templates`);
  }
}

function calculateNextRunDate(currentDate: string, frequency: string): string {
  const date = new Date(currentDate);
  switch (frequency) {
    case 'daily': date.setDate(date.getDate() + 1); break;
    case 'weekly': date.setDate(date.getDate() + 7); break;
    case 'monthly': date.setMonth(date.getMonth() + 1); break;
    case 'quarterly': date.setMonth(date.getMonth() + 3); break;
    case 'yearly': date.setFullYear(date.getFullYear() + 1); break;
    default: date.setMonth(date.getMonth() + 1); break;
  }
  return date.toISOString().split('T')[0];
}

/**
 * Generate expenses from recurring templates where nextRunDate <= today
 */
function generateRecurringExpenses(): void {
  const db = getDB();
  const today = new Date().toISOString().split('T')[0];

  // Find active recurring expense templates that are due
  const templates = dbAll(
    `SELECT * FROM recurring_expenses WHERE del_flag = 0 AND isActive = 1 AND nextRunDate <= ?`,
    [today]
  );

  if (templates.length === 0) return;

  let generated = 0;

  for (const template of templates) {
    try {
      // Count existing expenses to generate number
      const countResult = dbGet(`SELECT COUNT(*) as count FROM expenses WHERE organizationId = ?`, [template.organizationId]);
      const expenseNumber = `EXP-${String((countResult?.count || 0) + 1).padStart(5, '0')}`;

      const now = new Date().toISOString();
      const id = require('crypto').randomUUID();

      // Create draft expense
      db.run(
        `INSERT INTO expenses (id, organizationId, expenseNumber, vendorId, categoryId, category, amount, date, status, description, notes, del_flag, createdBy, createdAt, updatedAt, _dirty, _syncVersion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, 0, 'system', ?, ?, 1, 0)`,
        [
          id,
          template.organizationId,
          expenseNumber,
          template.vendorId || null,
          template.categoryId || null,
          template.category || '',
          template.amount || 0,
          today,
          template.name || '',
          `Auto-generated from recurring expense: ${template.name || ''}`,
          now,
          now,
        ]
      );

      // Update the template's nextRunDate based on frequency
      const nextDate = calculateNextRunDate(template.nextRunDate || today, template.frequency);
      db.run(
        `UPDATE recurring_expenses SET nextRunDate = ?, lastGeneratedAt = ?, updatedAt = ?, _dirty = 1 WHERE id = ?`,
        [nextDate, now, now, template.id]
      );

      // If endDate is set and next date exceeds it, deactivate
      if (template.endDate && nextDate > template.endDate) {
        db.run(`UPDATE recurring_expenses SET isActive = 0, updatedAt = ?, _dirty = 1 WHERE id = ?`, [now, template.id]);
      }

      generated++;
    } catch (err) {
      log.error(`Failed to generate expense from recurring template ${template.id}:`, err);
    }
  }

  if (generated > 0) {
    saveToDisk();
    log.info(`[Recurring] Generated ${generated} draft expense(s) from recurring templates`);
  }
}


/**
 * Generate invoices from active contracts where nextBillingDate <= today.
 * Matches the cloud scheduler behavior.
 */
function generateContractInvoices(): void {
  const db = getDB();
  const today = new Date().toISOString().split('T')[0];

  // Find active contracts
  const contracts = dbAll(
    `SELECT * FROM contracts WHERE del_flag = 0 AND status = 'active'`
  );

  if (contracts.length === 0) return;

  let generated = 0;

  for (const contract of contracts) {
    try {
      // Parse billingSchedule
      let billingSchedule: any = {};
      try { billingSchedule = typeof contract.billingSchedule === 'string' ? JSON.parse(contract.billingSchedule || '{}') : (contract.billingSchedule || {}); } catch {}

      const nextBillingDate = billingSchedule.nextBillingDate;
      if (!nextBillingDate || nextBillingDate > today) continue;

      // Parse line items
      let lineItems: any[] = [];
      try { lineItems = typeof contract.lineItems === 'string' ? JSON.parse(contract.lineItems || '[]') : (contract.lineItems || []); } catch {}

      // If no line items, create one from contractValue
      if (lineItems.length === 0 && contract.contractValue > 0) {
        lineItems = [{ description: contract.title || 'Contract billing', quantity: 1, rate: contract.contractValue, amount: contract.contractValue, taxRate: 0, taxAmount: 0 }];
      }

      const subtotal = lineItems.reduce((s: number, l: any) => s + (l.amount || 0), 0);
      const taxAmount = lineItems.reduce((s: number, l: any) => s + (l.taxAmount || 0), 0);
      const totalAmount = subtotal + taxAmount;

      if (totalAmount <= 0) continue;

      // Generate invoice number
      const countResult = dbGet(`SELECT COUNT(*) as count FROM invoices WHERE organizationId = ?`, [contract.organizationId]);
      const invoiceNumber = `INV-${String((countResult?.count || 0) + 1).padStart(5, '0')}`;

      // Calculate due date based on paymentTerms
      const dueDate = new Date();
      const terms = contract.paymentTerms || 'net-30';
      const days = parseInt(terms.replace(/\D/g, '')) || 30;
      dueDate.setDate(dueDate.getDate() + days);

      const now = new Date().toISOString();
      const id = require('crypto').randomUUID();

      // Create invoice
      db.run(
        `INSERT INTO invoices (id, organizationId, invoiceNumber, customerId, invoiceDate, dueDate, lineItems, subtotal, taxAmount, totalAmount, paidAmount, status, notes, del_flag, createdBy, createdAt, updatedAt, _dirty, _syncVersion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'sent', ?, 0, 'system', ?, ?, 1, 0)`,
        [
          id,
          contract.organizationId,
          invoiceNumber,
          contract.customerId || null,
          today,
          dueDate.toISOString().split('T')[0],
          JSON.stringify(lineItems.map((l: any) => ({ name: l.description, quantity: l.quantity || 1, unitPrice: l.rate || l.amount, total: l.amount, taxRate: l.taxRate || 0, taxAmount: l.taxAmount || 0 }))),
          subtotal,
          taxAmount,
          totalAmount,
          `Auto-generated from contract: ${contract.contractNumber} - ${contract.title}`,
          now,
          now,
        ]
      );

      // Calculate next billing date
      const frequency = billingSchedule.frequency || 'monthly';
      const nextDate = new Date(nextBillingDate);
      switch (frequency) {
        case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
        case 'bi-weekly': nextDate.setDate(nextDate.getDate() + 14); break;
        case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
        case 'quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
        case 'semi-annually': nextDate.setMonth(nextDate.getMonth() + 6); break;
        case 'annually': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
        default: nextDate.setMonth(nextDate.getMonth() + 1); break;
      }

      // Update contract: increment counter, set next billing date
      const updatedSchedule = JSON.stringify({ ...billingSchedule, nextBillingDate: nextDate.toISOString().split('T')[0], lastBillingDate: today });
      db.run(
        `UPDATE contracts SET billingSchedule = ?, invoicesGenerated = COALESCE(invoicesGenerated, 0) + 1, totalBilled = COALESCE(totalBilled, 0) + ?, updatedAt = ?, _dirty = 1 WHERE id = ?`,
        [updatedSchedule, totalAmount, now, contract.id]
      );

      // Check if contract has expired
      if (contract.endDate && nextDate.toISOString().split('T')[0] > contract.endDate) {
        // Check if auto-renew
        let renewal: any = {};
        try { renewal = typeof contract.renewal === 'string' ? JSON.parse(contract.renewal || '{}') : (contract.renewal || {}); } catch {}
        if (!renewal.autoRenew) {
          db.run(`UPDATE contracts SET status = 'expired', updatedAt = ?, _dirty = 1 WHERE id = ?`, [now, contract.id]);
        }
      }

      generated++;
    } catch (err) {
      log.error(`Failed to generate invoice from contract ${contract.id}:`, err);
    }
  }

  if (generated > 0) {
    saveToDisk();
    log.info(`[Contracts] Generated ${generated} invoice(s) from active contracts`);
  }
}
