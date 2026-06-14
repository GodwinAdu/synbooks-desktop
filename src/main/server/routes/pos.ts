import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';
import { getOrCreateAccount } from '../services/gl-posting';
import { getDB, saveToDisk } from '../../database';
import { v4 as uuid } from 'uuid';

export const posRouter = Router();
const saleRepo = new Repository<any>('pos_sales');
const productRepo = new Repository<any>('products');

posRouter.get('/sales', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50', startDate, endDate } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  res.json(saleRepo.findPaginated({ where, orderBy: 'createdAt', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) }));
});

posRouter.get('/sales/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = saleRepo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) { res.status(404).json({ error: 'Sale not found' }); return; }
  res.json(item);
});

posRouter.post('/sales', (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const count = saleRepo.count({ organizationId: req.organizationId });
    const saleNumber = `POS-${String(count + 1).padStart(6, '0')}`;

    const sale = saleRepo.create({
      ...data, organizationId: req.organizationId, saleNumber, createdBy: req.userId,
    });

    // Decrease stock for each line item
    const lineItems = data.lineItems || [];
    for (const item of lineItems) {
      const productId = item.productId?.includes("__") ? item.productId.split("__")[0] : item.productId;
      const product = productRepo.findById(productId);
      if (product && product.trackInventory) {
        productRepo.update(productId, { currentStock: Math.max(0, (product.currentStock || 0) - item.quantity) });
      }
    }

    // Auto-post to General Ledger (Debit: Cash, Credit: Revenue + Tax)
    const totalAmount = sale.totalAmount || data.totalAmount || 0;
    const taxAmount = sale.taxAmount || data.taxAmount || 0;
    const revenueAmount = totalAmount - taxAmount;

    if (totalAmount > 0) {
      const cashAccountId = getOrCreateAccount(req.organizationId!, "asset", "Cash", req.userId || "system");
      const revenueAccountId = getOrCreateAccount(req.organizationId!, "revenue", "Sales Revenue", req.userId || "system");

      const glLineItems: any[] = [
        { accountId: cashAccountId, description: `POS Sale ${saleNumber}`, debit: totalAmount, credit: 0 },
        { accountId: revenueAccountId, description: `POS Sale ${saleNumber}`, debit: 0, credit: revenueAmount },
      ];

      if (taxAmount > 0) {
        const taxAccountId = getOrCreateAccount(req.organizationId!, "liability", "VAT Payable", req.userId || "system");
        glLineItems.push({ accountId: taxAccountId, description: `VAT on POS Sale ${saleNumber}`, debit: 0, credit: taxAmount });
      }

      // Create journal entry
      const db = getDB();
      const now = new Date().toISOString();
      const entryId = uuid();
      db.run(
        `INSERT INTO journal_entries (id, organizationId, entryNumber, entryDate, description, lineItems, totalDebit, totalCredit, status, referenceType, referenceId, referenceNumber, createdBy, del_flag, createdAt, updatedAt, _dirty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'posted', 'pos_sale', ?, ?, ?, 0, ?, ?, 1)`,
        [entryId, req.organizationId, `JE-POS-${saleNumber}`, now, `POS Sale ${saleNumber}`, JSON.stringify(glLineItems), totalAmount, totalAmount, sale.id, saleNumber, req.userId || "system", now, now]
      );

      // Write GL entries and update account balances
      const fiscalYear = new Date().getFullYear();
      const fiscalPeriod = new Date().getMonth() + 1;
      for (const line of glLineItems) {
        db.run(
          `INSERT INTO general_ledger (id, organizationId, accountId, journalEntryId, transactionDate, description, debit, credit, runningBalance, referenceType, referenceId, referenceNumber, fiscalYear, fiscalPeriod, isReconciled, del_flag, createdAt, updatedAt, _dirty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'pos_sale', ?, ?, ?, ?, 0, 0, ?, ?, 1)`,
          [uuid(), req.organizationId, line.accountId, entryId, now, line.description, line.debit, line.credit, sale.id, saleNumber, fiscalYear, fiscalPeriod, now, now]
        );

        // Update account balance
        const stmt = db.prepare(`SELECT accountType, accountSubType, debitBalance, creditBalance FROM accounts WHERE id = ?`);
        stmt.bind([line.accountId]);
        if (stmt.step()) {
          const acct = stmt.getAsObject() as any;
          const isDebitNormal = acct.accountType === "asset" || acct.accountType === "expense";
          const newDebitBal = (acct.debitBalance || 0) + line.debit;
          const newCreditBal = (acct.creditBalance || 0) + line.credit;
          const newBalance = isDebitNormal ? newDebitBal - newCreditBal : newCreditBal - newDebitBal;
          stmt.free();
          db.run(`UPDATE accounts SET debitBalance = ?, creditBalance = ?, currentBalance = ?, updatedAt = ?, _dirty = 1 WHERE id = ?`,
            [newDebitBal, newCreditBal, newBalance, now, line.accountId]);
        } else {
          stmt.free();
        }
      }
      saveToDisk();
    }

    res.status(201).json({ success: true, data: sale });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

posRouter.get('/products', (req: AuthenticatedRequest, res: Response) => {
  const { search, category, page = '1', pageSize = '50' } = req.query;
  const limit = Math.min(parseInt(pageSize as string) || 50, 200);
  const offset = (Math.max(parseInt(page as string) || 1, 1) - 1) * limit;

  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0, status: 'active' };

  // Build a more specific query for search to leverage SQLite
  if (search) {
    // Use the repository's $like operator for name/sku/barcode
    // We'll do a custom query for better performance with OR conditions
    const db = getDB();
    const searchTerm = `%${(search as string).toLowerCase()}%`;
    const params: any[] = [req.organizationId, searchTerm, searchTerm, searchTerm];
    let query = `SELECT * FROM products WHERE organizationId = ? AND del_flag = 0 AND status = 'active' AND (LOWER(name) LIKE ? OR LOWER(sku) LIKE ? OR LOWER(barcode) LIKE ?)`;
    if (category && category !== 'all') {
      query += ` AND categoryName = ?`;
      params.push(category);
    }
    query += ` ORDER BY name ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const { dbAll: dbAllFn } = require('../../database');
    const products = dbAllFn(query, params);

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM products WHERE organizationId = ? AND del_flag = 0 AND status = 'active' AND (LOWER(name) LIKE ? OR LOWER(sku) LIKE ? OR LOWER(barcode) LIKE ?)`;
    const countParams: any[] = [req.organizationId, searchTerm, searchTerm, searchTerm];
    if (category && category !== 'all') { countQuery += ` AND categoryName = ?`; countParams.push(category); }
    const { dbGet: dbGetFn } = require('../../database');
    const countResult = dbGetFn(countQuery, countParams);

    // Deserialize JSON fields
    const jsonFields = ['variants', 'bundleItems', 'suppliers', 'images', 'customFields'];
    const deserialized = products.map((p: any) => {
      const result = { ...p };
      for (const field of jsonFields) {
        if (result[field] && typeof result[field] === 'string') {
          try { result[field] = JSON.parse(result[field]); } catch {}
        }
      }
      return result;
    });

    res.json({ data: deserialized, total: countResult?.total || 0, page: parseInt(page as string), pageSize: limit, hasMore: offset + limit < (countResult?.total || 0) });
    return;
  }

  // No search — paginated load
  if (category && category !== 'all') where.categoryName = category;
  const result = productRepo.findPaginated({ where, orderBy: 'name', order: 'ASC', page: parseInt(page as string), pageSize: limit });
  res.json({ ...result, hasMore: offset + limit < result.total });
});

posRouter.get('/summary', (req: AuthenticatedRequest, res: Response) => {
  const today = new Date().toISOString().split('T')[0];
  const sales = saleRepo.find({ where: { organizationId: req.organizationId, del_flag: 0 } });
  const todaySales = sales.filter((s: any) => s.createdAt?.startsWith(today));

  res.json({
    todayCount: todaySales.length,
    todayRevenue: todaySales.reduce((s: number, sale: any) => s + (sale.totalAmount || 0), 0),
    totalCount: sales.length,
    totalRevenue: sales.reduce((s: number, sale: any) => s + (sale.totalAmount || 0), 0),
  });
});
