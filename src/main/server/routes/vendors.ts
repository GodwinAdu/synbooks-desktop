import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const vendorsRouter = Router();
const repo = new Repository<any>('vendors');

vendorsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50', search } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (search) where.name = { $like: search };
  res.json(repo.findPaginated({ where, orderBy: 'name', order: 'ASC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) }));
});

vendorsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = repo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) { res.status(404).json({ error: 'Vendor not found' }); return; }
  res.json(item);
});

vendorsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = repo.count({ organizationId: req.organizationId });
    const item = repo.create({ ...req.body, organizationId: req.organizationId, vendorNumber: req.body.vendorNumber || `VEN-${String(count + 1).padStart(4, '0')}`, createdBy: req.userId });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

vendorsRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Vendor not found' }); return; }
  res.json({ success: true, data: repo.update(req.params.id, { ...req.body, modifiedBy: req.userId }) });
});

vendorsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Vendor not found' }); return; }
  repo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Vendor deleted' });
});

// ─── Vendor Transaction History ──────────────────────────────────────────────
vendorsRouter.get('/:id/transactions', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Vendor not found' }); return; }

  const { dbAll } = require('../../database');
  const orgId = req.organizationId;
  const vendorId = req.params.id;

  const bills = dbAll(`SELECT id, billNumber, billDate, dueDate, totalAmount, paidAmount, status FROM bills WHERE organizationId = ? AND vendorId = ? AND del_flag = 0 ORDER BY billDate DESC`, [orgId, vendorId]);
  const expenses = dbAll(`SELECT id, expenseNumber, date, amount, status, description FROM expenses WHERE organizationId = ? AND vendorId = ? AND del_flag = 0 ORDER BY date DESC`, [orgId, vendorId]);
  const purchaseOrders = dbAll(`SELECT id, poNumber, orderDate, totalAmount, status FROM purchase_orders WHERE organizationId = ? AND vendorId = ? AND del_flag = 0 ORDER BY orderDate DESC`, [orgId, vendorId]);

  const totalBilled = bills.reduce((s: number, b: any) => s + (b.totalAmount || 0), 0);
  const totalPaid = bills.reduce((s: number, b: any) => s + (b.paidAmount || 0), 0);
  const totalExpenses = expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const totalOutstanding = totalBilled - totalPaid;

  res.json({
    bills,
    expenses,
    purchaseOrders,
    summary: { totalBilled, totalPaid, totalOutstanding, totalExpenses, billCount: bills.length, expenseCount: expenses.length },
  });
});
