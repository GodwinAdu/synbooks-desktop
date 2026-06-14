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

  tasks.push(cron.schedule('0 * * * *', () => {
    try { processOverdueInvoices(); } catch (e) { log.error('Overdue invoices job failed:', e); }
  }));

  tasks.push(cron.schedule('0 * * * *', () => {
    try { processOverdueBills(); } catch (e) { log.error('Overdue bills job failed:', e); }
  }));

  tasks.push(cron.schedule('0 */6 * * *', () => {
    try { checkLowStock(); } catch (e) { log.error('Low stock job failed:', e); }
  }));

  tasks.push(cron.schedule('0 0 * * *', () => {
    try { checkBudgetVariance(); } catch (e) { log.error('Budget variance job failed:', e); }
  }));

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
