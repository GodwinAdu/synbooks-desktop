/**
 * General Ledger Posting Service
 * 
 * Port of backend/src/services/gl.service.ts for the desktop app.
 * Uses the same getOrCreateAccount pattern — accounts are auto-created
 * on first use if they don't exist yet. No seeding required.
 * 
 * This is the core accounting engine that makes double-entry bookkeeping work.
 */

import { v4 as uuid } from "uuid";
import { getDB, saveToDisk } from "../../database";
import log from "electron-log";

// ─── Contra Account Detection ───────────────────────────────────────────────

const CONTRA_ASSET_SUBTYPES = ["accumulated depreciation", "allowance for doubtful accounts"];
const CONTRA_EQUITY_SUBTYPES = ["drawings", "dividends", "drawings/dividends", "treasury stock"];

function isDebitNormal(accountType: string, accountSubType?: string): boolean {
  const sub = (accountSubType || "").toLowerCase().trim();
  if (accountType === "asset") return !CONTRA_ASSET_SUBTYPES.some(c => sub.includes(c));
  if (accountType === "expense") return true;
  if (accountType === "revenue") return false;
  if (accountType === "equity") return CONTRA_EQUITY_SUBTYPES.some(c => sub.includes(c));
  return false; // liability
}

// ─── Account Defaults (same as cloud backend) ───────────────────────────────

const ACCOUNT_DEFAULTS: Record<string, { code: string; type: string; subType: string }> = {
  "Sales Revenue":         { code: "4000", type: "revenue",   subType: "Sales Revenue" },
  "Service Revenue":       { code: "4010", type: "revenue",   subType: "Service Revenue" },
  "Accounts Receivable":   { code: "1200", type: "asset",     subType: "Current Asset" },
  "VAT Payable":           { code: "2100", type: "liability", subType: "Current Liability" },
  "Cash":                  { code: "1000", type: "asset",     subType: "Current Asset" },
  "Bank":                  { code: "1020", type: "asset",     subType: "Bank" },
  "Operating Expenses":    { code: "5000", type: "expense",   subType: "Operating Expenses" },
  "Accounts Payable":      { code: "2000", type: "liability", subType: "Current Liability" },
  "Purchases":             { code: "5100", type: "expense",   subType: "Operating Expense" },
  "Salaries Payable":      { code: "2200", type: "liability", subType: "Current Liability" },
  "Salary Expense":        { code: "5200", type: "expense",   subType: "Salaries & Wages" },
  "Tax Payable":           { code: "2110", type: "liability", subType: "Current Liability" },
  "SSNIT Payable":         { code: "2220", type: "liability", subType: "Current Liability" },
  "SSNIT Employer Expense":{ code: "5210", type: "expense",   subType: "Employee Benefits" },
  "Depreciation Expense":  { code: "5800", type: "expense",   subType: "Depreciation" },
  "Accumulated Depreciation": { code: "1600", type: "asset",  subType: "Accumulated Depreciation" },
  "Inventory":             { code: "1300", type: "asset",     subType: "Inventory" },
};

// ─── getOrCreateAccount (core function — same as cloud backend) ─────────────

export function getOrCreateAccount(organizationId: string, accountType: string, accountName: string, createdBy: string = "system"): string {
  const db = getDB();
  const meta = ACCOUNT_DEFAULTS[accountName] || { code: `9${Date.now().toString().slice(-3)}`, type: accountType, subType: accountType };

  // Try find by name first
  let stmt = db.prepare(`SELECT id FROM accounts WHERE organizationId = ? AND accountName = ? AND del_flag = 0 LIMIT 1`);
  stmt.bind([organizationId, accountName]);
  if (stmt.step()) { const id = (stmt.getAsObject() as any).id; stmt.free(); return id; }
  stmt.free();

  // Try find by code
  stmt = db.prepare(`SELECT id FROM accounts WHERE organizationId = ? AND accountCode = ? AND del_flag = 0 LIMIT 1`);
  stmt.bind([organizationId, meta.code]);
  if (stmt.step()) { const id = (stmt.getAsObject() as any).id; stmt.free(); return id; }
  stmt.free();

  // Doesn't exist — create it
  const id = uuid();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO accounts (id, organizationId, accountCode, accountName, accountType, accountSubType, level, isParent, currency, currentBalance, debitBalance, creditBalance, isActive, isSystemAccount, allowManualJournal, del_flag, createdBy, mod_flag, createdAt, updatedAt, _dirty)
     VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'GHS', 0, 0, 0, 1, 1, 1, 0, ?, 0, ?, ?, 1)`,
    [id, organizationId, meta.code, accountName, meta.type, meta.subType, createdBy, now, now]
  );
  saveToDisk();
  log.info(`[GL] Auto-created account: ${meta.code} - ${accountName} (${meta.type})`);
  return id;
}

// ─── Update Account Balance ─────────────────────────────────────────────────

function updateAccountBalance(accountId: string, debit: number, credit: number): void {
  const db = getDB();
  // Get current account to determine normal balance direction
  const stmt = db.prepare(`SELECT accountType, accountSubType, debitBalance, creditBalance FROM accounts WHERE id = ?`);
  stmt.bind([accountId]);
  if (!stmt.step()) { stmt.free(); return; }
  const account = stmt.getAsObject() as any;
  stmt.free();

  const newDebitBal = (account.debitBalance || 0) + debit;
  const newCreditBal = (account.creditBalance || 0) + credit;
  const newBalance = isDebitNormal(account.accountType, account.accountSubType)
    ? newDebitBal - newCreditBal
    : newCreditBal - newDebitBal;

  db.run(
    `UPDATE accounts SET debitBalance = ?, creditBalance = ?, currentBalance = ?, updatedAt = ?, _dirty = 1 WHERE id = ?`,
    [newDebitBal, newCreditBal, newBalance, new Date().toISOString(), accountId]
  );
}

// ─── Write GL Entries ───────────────────────────────────────────────────────

function writeGLEntries(
  organizationId: string, journalEntryId: string,
  lineItems: Array<{ accountId: string; description: string; debit: number; credit: number }>,
  transactionDate: string, referenceType: string, referenceId: string, referenceNumber: string
): void {
  const db = getDB();
  const now = new Date().toISOString();
  const fiscalYear = new Date(transactionDate).getFullYear();
  const fiscalPeriod = new Date(transactionDate).getMonth() + 1;

  for (const line of lineItems) {
    db.run(
      `INSERT INTO general_ledger (id, organizationId, accountId, journalEntryId, transactionDate, description, debit, credit, runningBalance, referenceType, referenceId, referenceNumber, fiscalYear, fiscalPeriod, isReconciled, del_flag, createdAt, updatedAt, _dirty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 0, 0, ?, ?, 1)`,
      [uuid(), organizationId, line.accountId, journalEntryId, transactionDate, line.description, line.debit, line.credit, referenceType, referenceId, referenceNumber, fiscalYear, fiscalPeriod, now, now]
    );
    updateAccountBalance(line.accountId, line.debit, line.credit);
  }
  saveToDisk();
}

// ─── Check for duplicate posting ────────────────────────────────────────────

function hasExistingPosting(organizationId: string, referenceType: string, referenceId: string): boolean {
  const db = getDB();
  const stmt = db.prepare(`SELECT id FROM journal_entries WHERE organizationId = ? AND referenceType = ? AND referenceId = ? AND del_flag = 0 LIMIT 1`);
  stmt.bind([organizationId, referenceType, referenceId]);
  const exists = stmt.step();
  stmt.free();
  return exists;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC POSTING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function postInvoiceToGL(invoiceId: string, organizationId: string, invoice: any, userId: string = "system") {
  if (hasExistingPosting(organizationId, "invoice", invoiceId)) return { success: true };

  const receivableAccount = invoice.receivableAccountId || getOrCreateAccount(organizationId, "asset", "Accounts Receivable", userId);
  const revenueAccount = invoice.revenueAccountId || getOrCreateAccount(organizationId, "revenue", "Sales Revenue", userId);
  const taxAccount = invoice.taxAccountId || getOrCreateAccount(organizationId, "liability", "VAT Payable", userId);

  const lineItems: any[] = [
    { accountId: receivableAccount, description: `Invoice ${invoice.invoiceNumber}`, debit: invoice.totalAmount, credit: 0 },
    { accountId: revenueAccount, description: `Invoice ${invoice.invoiceNumber}`, debit: 0, credit: (invoice.subtotal || invoice.totalAmount - (invoice.taxAmount || 0)) },
  ];
  if ((invoice.taxAmount || 0) > 0) {
    lineItems.push({ accountId: taxAccount, description: `VAT on Invoice ${invoice.invoiceNumber}`, debit: 0, credit: invoice.taxAmount });
  }

  const db = getDB();
  const now = new Date().toISOString();
  const entryId = uuid();
  const entryNumber = `JE-INV-${invoice.invoiceNumber}`;

  db.run(
    `INSERT INTO journal_entries (id, organizationId, entryNumber, entryDate, description, lineItems, totalDebit, totalCredit, status, referenceType, referenceId, referenceNumber, createdBy, del_flag, createdAt, updatedAt, _dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'posted', 'invoice', ?, ?, ?, 0, ?, ?, 1)`,
    [entryId, organizationId, entryNumber, invoice.invoiceDate || now, `Invoice ${invoice.invoiceNumber}`, JSON.stringify(lineItems), invoice.totalAmount, invoice.totalAmount, invoiceId, invoice.invoiceNumber, userId, now, now]
  );

  writeGLEntries(organizationId, entryId, lineItems, invoice.invoiceDate || now, "invoice", invoiceId, invoice.invoiceNumber);
  log.info(`[GL] Posted invoice ${invoice.invoiceNumber}`);
  return { success: true, journalEntryId: entryId };
}

export function postPaymentToGL(paymentId: string, organizationId: string, payment: any, userId: string = "system") {
  if (hasExistingPosting(organizationId, "payment", paymentId)) return { success: true };

  const bankAccount = getOrCreateAccount(organizationId, "asset", "Cash", userId);
  const receivableAccount = getOrCreateAccount(organizationId, "asset", "Accounts Receivable", userId);

  const lineItems = [
    { accountId: bankAccount, description: `Payment ${payment.paymentNumber || ""}`, debit: payment.amount, credit: 0 },
    { accountId: receivableAccount, description: `Payment ${payment.paymentNumber || ""}`, debit: 0, credit: payment.amount },
  ];

  const db = getDB();
  const now = new Date().toISOString();
  const entryId = uuid();
  const entryNumber = `JE-PAY-${payment.paymentNumber || paymentId.slice(0, 8)}`;

  db.run(
    `INSERT INTO journal_entries (id, organizationId, entryNumber, entryDate, description, lineItems, totalDebit, totalCredit, status, referenceType, referenceId, referenceNumber, createdBy, del_flag, createdAt, updatedAt, _dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'posted', 'payment', ?, ?, ?, 0, ?, ?, 1)`,
    [entryId, organizationId, entryNumber, payment.paymentDate || now, `Payment received`, JSON.stringify(lineItems), payment.amount, payment.amount, paymentId, payment.paymentNumber || "", userId, now, now]
  );

  writeGLEntries(organizationId, entryId, lineItems, payment.paymentDate || now, "payment", paymentId, payment.paymentNumber || "");
  return { success: true, journalEntryId: entryId };
}

export function postExpenseToGL(expenseId: string, organizationId: string, expense: any, userId: string = "system") {
  if (hasExistingPosting(organizationId, "expense", expenseId)) return { success: true };

  const expenseAccount = expense.expenseAccountId || getOrCreateAccount(organizationId, "expense", "Operating Expenses", userId);
  const paymentAccount = expense.paymentAccountId || getOrCreateAccount(organizationId, "asset", "Cash", userId);

  const lineItems = [
    { accountId: expenseAccount, description: `Expense ${expense.expenseNumber}`, debit: expense.amount, credit: 0 },
    { accountId: paymentAccount, description: `Expense ${expense.expenseNumber}`, debit: 0, credit: expense.amount },
  ];

  const db = getDB();
  const now = new Date().toISOString();
  const entryId = uuid();

  db.run(
    `INSERT INTO journal_entries (id, organizationId, entryNumber, entryDate, description, lineItems, totalDebit, totalCredit, status, referenceType, referenceId, referenceNumber, createdBy, del_flag, createdAt, updatedAt, _dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'posted', 'expense', ?, ?, ?, 0, ?, ?, 1)`,
    [entryId, organizationId, `JE-EXP-${expense.expenseNumber}`, expense.date || now, `Expense ${expense.expenseNumber}`, JSON.stringify(lineItems), expense.amount, expense.amount, expenseId, expense.expenseNumber, userId, now, now]
  );

  writeGLEntries(organizationId, entryId, lineItems, expense.date || now, "expense", expenseId, expense.expenseNumber);
  return { success: true, journalEntryId: entryId };
}

export function postBillToGL(billId: string, organizationId: string, bill: any, userId: string = "system") {
  if (hasExistingPosting(organizationId, "bill", billId)) return { success: true };

  const expenseAccount = bill.expenseAccountId || getOrCreateAccount(organizationId, "expense", "Purchases", userId);
  const payableAccount = bill.payableAccountId || getOrCreateAccount(organizationId, "liability", "Accounts Payable", userId);

  const total = bill.totalAmount || bill.subtotal || 0;
  const lineItems = [
    { accountId: expenseAccount, description: `Bill ${bill.billNumber}`, debit: total, credit: 0 },
    { accountId: payableAccount, description: `Bill ${bill.billNumber}`, debit: 0, credit: total },
  ];

  const db = getDB();
  const now = new Date().toISOString();
  const entryId = uuid();

  db.run(
    `INSERT INTO journal_entries (id, organizationId, entryNumber, entryDate, description, lineItems, totalDebit, totalCredit, status, referenceType, referenceId, referenceNumber, createdBy, del_flag, createdAt, updatedAt, _dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'posted', 'bill', ?, ?, ?, 0, ?, ?, 1)`,
    [entryId, organizationId, `JE-BILL-${bill.billNumber}`, bill.billDate || now, `Bill ${bill.billNumber}`, JSON.stringify(lineItems), total, total, billId, bill.billNumber, userId, now, now]
  );

  writeGLEntries(organizationId, entryId, lineItems, bill.billDate || now, "bill", billId, bill.billNumber);
  return { success: true, journalEntryId: entryId };
}

export function postBillPaymentToGL(billId: string, organizationId: string, bill: any, amount: number, userId: string = "system") {
  const payableAccount = bill.payableAccountId || getOrCreateAccount(organizationId, "liability", "Accounts Payable", userId);
  const cashAccount = getOrCreateAccount(organizationId, "asset", "Cash", userId);

  const lineItems = [
    { accountId: payableAccount, description: `Payment for Bill ${bill.billNumber}`, debit: amount, credit: 0 },
    { accountId: cashAccount, description: `Payment for Bill ${bill.billNumber}`, debit: 0, credit: amount },
  ];

  const db = getDB();
  const now = new Date().toISOString();
  const entryId = uuid();

  db.run(
    `INSERT INTO journal_entries (id, organizationId, entryNumber, entryDate, description, lineItems, totalDebit, totalCredit, status, referenceType, referenceId, referenceNumber, createdBy, del_flag, createdAt, updatedAt, _dirty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'posted', 'bill_payment', ?, ?, ?, 0, ?, ?, 1)`,
    [entryId, organizationId, `JE-BP-${bill.billNumber}`, now, `Payment for Bill ${bill.billNumber}`, JSON.stringify(lineItems), amount, amount, billId, bill.billNumber, userId, now, now]
  );

  writeGLEntries(organizationId, entryId, lineItems, now, "bill_payment", billId, bill.billNumber);
  return { success: true, journalEntryId: entryId };
}
