/**
 * SQLite Database Layer (using sql.js - pure JS, no native deps)
 * 
 * Replaces MongoDB/Mongoose for offline desktop storage.
 * sql.js is a WebAssembly-compiled SQLite that works without
 * any native compilation or Visual Studio Build Tools.
 * 
 * Data is persisted to disk manually after mutations.
 */

import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import fs from "fs";
import path from "path";
import log from "electron-log";

let db: SqlJsDatabase | null = null;
let dbPath: string = "";
let saveTimeout: NodeJS.Timeout | null = null;

export function getDB(): SqlJsDatabase {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return db;
}

/**
 * Helper: Execute a query and return all rows as an array (mimics better-sqlite3 .all())
 * Use this instead of db.prepare().all() which doesn't exist in sql.js
 */
export function dbAll(query: string, params: any[] = []): any[] {
  const database = getDB();
  const results: any[] = [];
  const stmt = database.prepare(query);
  if (params.length > 0) stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * Helper: Execute a query and return the first row (mimics better-sqlite3 .get())
 */
export function dbGet(query: string, params: any[] = []): any | null {
  const database = getDB();
  const stmt = database.prepare(query);
  if (params.length > 0) stmt.bind(params);
  if (stmt.step()) {
    const result = stmt.getAsObject();
    stmt.free();
    return result;
  }
  stmt.free();
  return null;
}

export async function initializeDatabase(filePath: string): Promise<void> {
  dbPath = filePath;
  log.info(`Initializing SQLite database at: ${filePath}`);

  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(filePath)) {
    const buffer = fs.readFileSync(filePath);
    db = new SQL.Database(buffer);
    log.info("Loaded existing database");
  } else {
    db = new SQL.Database();
    log.info("Created new database");
  }

  // Performance pragmas
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA synchronous = NORMAL");
  db.run("PRAGMA foreign_keys = ON");
  db.run("PRAGMA cache_size = -64000");

  // Create tables
  createTables(db);
  saveToDisk();

  log.info("Database tables created/verified");
}

/**
 * Save database to disk (debounced - called after mutations)
 */
export function saveToDisk(): void {
  if (!db || !dbPath) return;

  // Debounce: only write once per 500ms even if multiple mutations happen
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const data = db!.export();
      fs.writeFileSync(dbPath, Buffer.from(data));
    } catch (err) {
      log.error("Failed to save database to disk:", err);
    }
  }, 500);
}

/**
 * Force immediate save (call before app quit)
 */
export function saveImmediately(): void {
  if (!db || !dbPath) return;
  if (saveTimeout) { clearTimeout(saveTimeout); saveTimeout = null; }
  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
    log.info("Database saved to disk");
  } catch (err) {
    log.error("Failed to save database:", err);
  }
}

export function closeDatabase(): void {
  if (db) {
    saveImmediately();
    db.close();
    db = null;
  }
}

function createTables(db: SqlJsDatabase): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      organizationCode TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      owner TEXT,
      logo TEXT, email TEXT, phone TEXT, website TEXT,
      taxId TEXT, registrationNumber TEXT, industry TEXT, companySize TEXT,
      address TEXT DEFAULT '{}',
      settings TEXT DEFAULT '{}',
      subscriptionPlan TEXT DEFAULT '{}',
      modules TEXT DEFAULT '{}',
      notificationSettings TEXT DEFAULT '{}',
      security TEXT DEFAULT '{}',
      backupSettings TEXT DEFAULT '{}',
      taxSettings TEXT DEFAULT '{}',
      isActive INTEGER DEFAULT 1,
      suspended INTEGER DEFAULT 0,
      del_flag INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      _syncVersion INTEGER DEFAULT 0,
      _lastSyncedAt TEXT,
      _dirty INTEGER DEFAULT 1
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      organizationId TEXT NOT NULL,
      organizations TEXT DEFAULT '[]',
      fullName TEXT DEFAULT '',
      email TEXT DEFAULT '',
      password TEXT,
      role TEXT NOT NULL,
      profileImage TEXT, phone TEXT,
      isActive INTEGER DEFAULT 1,
      del_flag INTEGER DEFAULT 0,
      permissions TEXT DEFAULT '[]',
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      _syncVersion INTEGER DEFAULT 0,
      _lastSyncedAt TEXT,
      _dirty INTEGER DEFAULT 1
    )
  `);

  db.run(`CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, accountCode TEXT NOT NULL, accountName TEXT NOT NULL, accountType TEXT NOT NULL, accountSubType TEXT NOT NULL, parentAccountId TEXT, level INTEGER DEFAULT 0, isParent INTEGER DEFAULT 0, currency TEXT DEFAULT 'GHS', currentBalance REAL DEFAULT 0, debitBalance REAL DEFAULT 0, creditBalance REAL DEFAULT 0, isActive INTEGER DEFAULT 1, isSystemAccount INTEGER DEFAULT 0, allowManualJournal INTEGER DEFAULT 1, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, customerNumber TEXT, name TEXT NOT NULL, email TEXT, phone TEXT, company TEXT, taxId TEXT, address TEXT DEFAULT '{}', creditLimit REAL DEFAULT 0, currentBalance REAL DEFAULT 0, paymentTerms TEXT DEFAULT 'net30', notes TEXT, status TEXT DEFAULT 'active', del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, invoiceNumber TEXT NOT NULL, customerId TEXT NOT NULL, invoiceDate TEXT NOT NULL, dueDate TEXT NOT NULL, lineItems TEXT DEFAULT '[]', subtotal REAL NOT NULL, taxRate REAL DEFAULT 0, taxAmount REAL DEFAULT 0, totalAmount REAL NOT NULL, paidAmount REAL DEFAULT 0, status TEXT DEFAULT 'draft', revenueAccountId TEXT, receivableAccountId TEXT, taxAccountId TEXT, projectId TEXT, contractId TEXT, notes TEXT, terms TEXT, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS vendors (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, vendorNumber TEXT, name TEXT NOT NULL, email TEXT, phone TEXT, company TEXT, taxId TEXT, address TEXT DEFAULT '{}', paymentTerms TEXT DEFAULT 'net30', bankDetails TEXT DEFAULT '{}', currentBalance REAL DEFAULT 0, notes TEXT, status TEXT DEFAULT 'active', del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, expenseNumber TEXT NOT NULL, vendorId TEXT, categoryId TEXT, date TEXT NOT NULL, amount REAL NOT NULL, taxAmount REAL DEFAULT 0, taxRate REAL DEFAULT 0, isTaxable INTEGER DEFAULT 1, paymentMethod TEXT NOT NULL, reference TEXT, description TEXT, receiptUrl TEXT, status TEXT DEFAULT 'pending', isReimbursable INTEGER DEFAULT 0, expenseAccountId TEXT, paymentAccountId TEXT, projectId TEXT, approvedBy TEXT, approvedAt TEXT, rejectedBy TEXT, rejectedAt TEXT, rejectionReason TEXT, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS bills (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, billNumber TEXT NOT NULL, vendorId TEXT NOT NULL, billDate TEXT NOT NULL, dueDate TEXT NOT NULL, lineItems TEXT DEFAULT '[]', subtotal REAL NOT NULL, taxAmount REAL DEFAULT 0, totalAmount REAL NOT NULL, paidAmount REAL DEFAULT 0, status TEXT DEFAULT 'draft', payableAccountId TEXT, expenseAccountId TEXT, projectId TEXT, notes TEXT, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, sku TEXT NOT NULL, barcode TEXT, name TEXT NOT NULL, description TEXT, categoryId TEXT, type TEXT DEFAULT 'product', costPrice REAL DEFAULT 0, sellingPrice REAL NOT NULL, margin REAL, taxable INTEGER DEFAULT 1, taxRate REAL, trackInventory INTEGER DEFAULT 1, currentStock REAL DEFAULT 0, reorderLevel REAL DEFAULT 20, reorderQuantity REAL, unit TEXT DEFAULT 'pcs', hasVariants INTEGER DEFAULT 0, variants TEXT DEFAULT '[]', bundleItems TEXT DEFAULT '[]', suppliers TEXT DEFAULT '[]', images TEXT DEFAULT '[]', primaryImage TEXT, customFields TEXT DEFAULT '{}', status TEXT DEFAULT 'active', del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS employees (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, userId TEXT, name TEXT, employeeNumber TEXT NOT NULL, dateOfBirth TEXT, gender TEXT, address TEXT DEFAULT '{}', department TEXT NOT NULL, position TEXT NOT NULL, employmentType TEXT DEFAULT 'full-time', hireDate TEXT NOT NULL, terminationDate TEXT, salary REAL NOT NULL, allowances TEXT DEFAULT '[]', paymentFrequency TEXT DEFAULT 'monthly', bankDetails TEXT DEFAULT '{}', taxInfo TEXT DEFAULT '{}', status TEXT DEFAULT 'active', del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS payroll_runs (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, runNumber TEXT NOT NULL, payPeriod TEXT NOT NULL, payDate TEXT NOT NULL, startDate TEXT NOT NULL, endDate TEXT NOT NULL, employeePayments TEXT DEFAULT '[]', totalGrossPay REAL NOT NULL, totalDeductions REAL NOT NULL, totalNetPay REAL NOT NULL, totalEmployerCost REAL DEFAULT 0, employeeCount INTEGER NOT NULL, status TEXT DEFAULT 'draft', processedBy TEXT, processedAt TEXT, notes TEXT, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS bank_accounts (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, accountName TEXT NOT NULL, bankName TEXT NOT NULL, accountNumber TEXT, accountType TEXT DEFAULT 'checking', currency TEXT DEFAULT 'GHS', currentBalance REAL DEFAULT 0, chartAccountId TEXT, isActive INTEGER DEFAULT 1, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS bank_transactions (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, bankAccountId TEXT NOT NULL, transactionNumber TEXT NOT NULL, transactionDate TEXT NOT NULL, transactionType TEXT NOT NULL, amount REAL NOT NULL, description TEXT NOT NULL, payee TEXT, referenceNumber TEXT, category TEXT, isReconciled INTEGER DEFAULT 0, reconciledDate TEXT, journalEntryId TEXT, notes TEXT, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS journal_entries (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, entryNumber TEXT NOT NULL, entryDate TEXT NOT NULL, description TEXT NOT NULL, lineItems TEXT DEFAULT '[]', totalDebit REAL DEFAULT 0, totalCredit REAL DEFAULT 0, status TEXT DEFAULT 'draft', referenceType TEXT, referenceId TEXT, referenceNumber TEXT, projectId TEXT, notes TEXT, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS general_ledger (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, accountId TEXT NOT NULL, journalEntryId TEXT NOT NULL, transactionDate TEXT NOT NULL, description TEXT NOT NULL, debit REAL DEFAULT 0, credit REAL DEFAULT 0, runningBalance REAL DEFAULT 0, referenceType TEXT, referenceId TEXT, referenceNumber TEXT, fiscalYear INTEGER NOT NULL, fiscalPeriod INTEGER NOT NULL, isReconciled INTEGER DEFAULT 0, del_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, projectNumber TEXT, name TEXT NOT NULL, description TEXT, customerId TEXT, status TEXT DEFAULT 'active', startDate TEXT, endDate TEXT, budget REAL DEFAULT 0, spent REAL DEFAULT 0, progress REAL DEFAULT 0, managerId TEXT, members TEXT DEFAULT '[]', tags TEXT DEFAULT '[]', del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS budgets (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, name TEXT NOT NULL, fiscalYear INTEGER NOT NULL, startDate TEXT NOT NULL, endDate TEXT NOT NULL, lineItems TEXT DEFAULT '[]', totalBudget REAL DEFAULT 0, totalActual REAL DEFAULT 0, status TEXT DEFAULT 'draft', del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS fixed_assets (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, assetNumber TEXT NOT NULL, name TEXT NOT NULL, description TEXT, categoryId TEXT, purchaseDate TEXT NOT NULL, purchaseCost REAL NOT NULL, currentValue REAL, depreciationMethod TEXT DEFAULT 'straight-line', usefulLife INTEGER, salvageValue REAL DEFAULT 0, accumulatedDepreciation REAL DEFAULT 0, location TEXT, assignedTo TEXT, status TEXT DEFAULT 'active', del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS crm_contacts (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, name TEXT NOT NULL, email TEXT, phone TEXT, company TEXT, position TEXT, type TEXT DEFAULT 'lead', source TEXT, status TEXT DEFAULT 'active', tags TEXT DEFAULT '[]', customFields TEXT DEFAULT '{}', notes TEXT, assignedTo TEXT, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS crm_deals (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, title TEXT NOT NULL, contactId TEXT, value REAL DEFAULT 0, currency TEXT DEFAULT 'GHS', stage TEXT DEFAULT 'new', probability REAL DEFAULT 0, expectedCloseDate TEXT, assignedTo TEXT, notes TEXT, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS pos_sales (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, saleNumber TEXT NOT NULL, customerId TEXT, customerName TEXT, lineItems TEXT DEFAULT '[]', subtotal REAL NOT NULL, discountAmount REAL DEFAULT 0, taxAmount REAL DEFAULT 0, totalAmount REAL NOT NULL, paymentMethod TEXT NOT NULL, amountTendered REAL, changeDue REAL, splitPayments TEXT DEFAULT '[]', sessionId TEXT, notes TEXT, status TEXT DEFAULT 'completed', del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, paymentNumber TEXT NOT NULL, customerId TEXT, vendorId TEXT, paymentType TEXT NOT NULL, amount REAL NOT NULL, paymentDate TEXT NOT NULL, paymentMethod TEXT, referenceNumber TEXT, invoiceId TEXT, billId TEXT, depositAccountId TEXT, notes TEXT, status TEXT DEFAULT 'completed', del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  // Production tables
  db.run(`CREATE TABLE IF NOT EXISTS work_orders (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, workOrderNumber TEXT NOT NULL, bomId TEXT, bomName TEXT, productId TEXT, productName TEXT, quantity REAL DEFAULT 0, completedQuantity REAL DEFAULT 0, rejectedQuantity REAL DEFAULT 0, startDate TEXT, dueDate TEXT, completedDate TEXT, status TEXT DEFAULT 'draft', priority TEXT DEFAULT 'normal', workCenterId TEXT, workCenterName TEXT, estimatedCost REAL DEFAULT 0, actualCost REAL DEFAULT 0, notes TEXT, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS bill_of_materials (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, bomNumber TEXT NOT NULL, name TEXT NOT NULL, productId TEXT, productName TEXT, outputQuantity REAL DEFAULT 1, outputUnit TEXT DEFAULT 'pcs', materials TEXT DEFAULT '[]', costPerUnit REAL DEFAULT 0, isActive INTEGER DEFAULT 1, notes TEXT, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS work_centers (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, name TEXT NOT NULL, code TEXT, type TEXT DEFAULT 'workstation', capacity REAL DEFAULT 0, capacityUnit TEXT DEFAULT 'units/hour', costPerHour REAL DEFAULT 0, status TEXT DEFAULT 'active', location TEXT, notes TEXT, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  // Procurement tables
  db.run(`CREATE TABLE IF NOT EXISTS requisitions (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, requisitionNumber TEXT NOT NULL, requestedBy TEXT, department TEXT, items TEXT DEFAULT '[]', totalAmount REAL DEFAULT 0, status TEXT DEFAULT 'draft', priority TEXT DEFAULT 'normal', requiredDate TEXT, notes TEXT, approvedBy TEXT, approvedAt TEXT, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS goods_received (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, grnNumber TEXT NOT NULL, purchaseOrderId TEXT, poNumber TEXT, vendorId TEXT, vendorName TEXT, receivedDate TEXT NOT NULL, items TEXT DEFAULT '[]', status TEXT DEFAULT 'pending_inspection', receivedBy TEXT, notes TEXT, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  // Contracts table
  db.run(`CREATE TABLE IF NOT EXISTS contracts (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, contractNumber TEXT NOT NULL, title TEXT NOT NULL, customerId TEXT, customerName TEXT, vendorId TEXT, vendorName TEXT, type TEXT DEFAULT 'service', status TEXT DEFAULT 'draft', startDate TEXT NOT NULL, endDate TEXT, value REAL DEFAULT 0, billingFrequency TEXT DEFAULT 'monthly', autoRenew INTEGER DEFAULT 0, renewalTerms TEXT, description TEXT, terms TEXT, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS estimates (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, estimateNumber TEXT NOT NULL, customerId TEXT NOT NULL, estimateDate TEXT NOT NULL, expiryDate TEXT, lineItems TEXT DEFAULT '[]', subtotal REAL NOT NULL, taxAmount REAL DEFAULT 0, totalAmount REAL NOT NULL, status TEXT DEFAULT 'draft', notes TEXT, terms TEXT, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS credit_notes (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, creditNoteNumber TEXT NOT NULL, customerId TEXT NOT NULL, invoiceId TEXT, creditNoteDate TEXT NOT NULL, lineItems TEXT DEFAULT '[]', subtotal REAL NOT NULL, taxAmount REAL DEFAULT 0, totalAmount REAL NOT NULL, status TEXT DEFAULT 'draft', reason TEXT, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS purchase_orders (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, poNumber TEXT NOT NULL, vendorId TEXT NOT NULL, orderDate TEXT NOT NULL, expectedDate TEXT, lineItems TEXT DEFAULT '[]', subtotal REAL NOT NULL, taxAmount REAL DEFAULT 0, totalAmount REAL NOT NULL, status TEXT DEFAULT 'draft', notes TEXT, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, deletedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  // Recurring & scheduling tables
  db.run(`CREATE TABLE IF NOT EXISTS recurring_invoices (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, profileName TEXT, customerId TEXT, frequency TEXT DEFAULT 'monthly', startDate TEXT, endDate TEXT, nextRunDate TEXT, lineItems TEXT DEFAULT '[]', subtotal REAL DEFAULT 0, taxAmount REAL DEFAULT 0, totalAmount REAL DEFAULT 0, isActive INTEGER DEFAULT 1, lastGeneratedAt TEXT, notes TEXT, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS recurring_expenses (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, name TEXT, vendorId TEXT, amount REAL DEFAULT 0, frequency TEXT DEFAULT 'monthly', categoryId TEXT, startDate TEXT, endDate TEXT, nextRunDate TEXT, isActive INTEGER DEFAULT 1, notes TEXT, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS recurring_journals (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, name TEXT, description TEXT, frequency TEXT DEFAULT 'monthly', lineItems TEXT DEFAULT '[]', startDate TEXT, endDate TEXT, nextRunDate TEXT, isActive INTEGER DEFAULT 1, lastGeneratedAt TEXT, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS deductions (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, name TEXT NOT NULL, type TEXT DEFAULT 'fixed', amount REAL DEFAULT 0, percentage REAL DEFAULT 0, isPreTax INTEGER DEFAULT 0, isActive INTEGER DEFAULT 1, applicableTo TEXT DEFAULT 'all', del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS leave_requests (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, employeeId TEXT NOT NULL, leaveType TEXT NOT NULL, startDate TEXT NOT NULL, endDate TEXT NOT NULL, days REAL DEFAULT 1, reason TEXT, status TEXT DEFAULT 'pending', approvedBy TEXT, approvedAt TEXT, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS time_entries (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, employeeId TEXT NOT NULL, projectId TEXT, date TEXT NOT NULL, hours REAL NOT NULL, description TEXT, billable INTEGER DEFAULT 1, status TEXT DEFAULT 'pending', approvedBy TEXT, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);

  db.run(`CREATE TABLE IF NOT EXISTS bank_rules (id TEXT PRIMARY KEY, organizationId TEXT NOT NULL, name TEXT NOT NULL, conditions TEXT DEFAULT '[]', actions TEXT DEFAULT '{}', isActive INTEGER DEFAULT 1, priority INTEGER DEFAULT 0, del_flag INTEGER DEFAULT 0, createdBy TEXT NOT NULL, modifiedBy TEXT, mod_flag INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')), updatedAt TEXT DEFAULT (datetime('now')), _syncVersion INTEGER DEFAULT 0, _lastSyncedAt TEXT, _dirty INTEGER DEFAULT 1)`);


  // Sync tracking
  db.run(`CREATE TABLE IF NOT EXISTS _sync_log (id TEXT PRIMARY KEY, tableName TEXT NOT NULL, operation TEXT NOT NULL, recordId TEXT NOT NULL, data TEXT, syncedAt TEXT, status TEXT DEFAULT 'pending', errorMessage TEXT, retryCount INTEGER DEFAULT 0, createdAt TEXT DEFAULT (datetime('now')))`);

  db.run(`CREATE TABLE IF NOT EXISTS _sync_state (tableName TEXT PRIMARY KEY, lastSyncedAt TEXT, lastSyncVersion INTEGER DEFAULT 0, recordCount INTEGER DEFAULT 0)`);

  // Indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organizationId, del_flag, status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_expenses_org ON expenses(organizationId, del_flag, date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_products_org ON products(organizationId, del_flag, status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_customers_org ON customers(organizationId, del_flag)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_vendors_org ON vendors(organizationId, del_flag)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(organizationId, del_flag, status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_sync_log_status ON _sync_log(status, tableName)`);
}
