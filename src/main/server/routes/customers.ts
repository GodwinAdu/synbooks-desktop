import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';
import { checkPlanLimit } from '../middleware/plan-limits';

export const customersRouter = Router();
const repo = new Repository<any>('customers');

customersRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50', search } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (search) where.name = { $like: search };
  res.json(repo.findPaginated({ where, orderBy: 'name', order: 'ASC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) }));
});

customersRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = repo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) { res.status(404).json({ error: 'Customer not found' }); return; }
  res.json(item);
});

customersRouter.post('/', checkPlanLimit('customers'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = repo.count({ organizationId: req.organizationId });
    const item = repo.create({ ...req.body, organizationId: req.organizationId, customerNumber: req.body.customerNumber || `CUST-${String(count + 1).padStart(4, '0')}`, createdBy: req.userId });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

customersRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Customer not found' }); return; }
  res.json({ success: true, data: repo.update(req.params.id, { ...req.body, modifiedBy: req.userId }) });
});

customersRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Customer not found' }); return; }
  repo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Customer deleted' });
});

// ─── Customer Transaction History ────────────────────────────────────────────
customersRouter.get('/:id/transactions', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Customer not found' }); return; }

  const { dbAll } = require('../../database');
  const orgId = req.organizationId;
  const custId = req.params.id;

  const invoices = dbAll(`SELECT id, invoiceNumber, invoiceDate, dueDate, totalAmount, paidAmount, status FROM invoices WHERE organizationId = ? AND customerId = ? AND del_flag = 0 ORDER BY invoiceDate DESC`, [orgId, custId]);
  const payments = dbAll(`SELECT id, paymentNumber, paymentDate, amount, paymentMethod, status FROM payments WHERE organizationId = ? AND customerId = ? AND del_flag = 0 ORDER BY paymentDate DESC`, [orgId, custId]);
  const creditNotes = dbAll(`SELECT id, creditNoteNumber, issueDate, totalAmount, status FROM credit_notes WHERE organizationId = ? AND customerId = ? AND del_flag = 0 ORDER BY issueDate DESC`, [orgId, custId]);
  const estimates = dbAll(`SELECT id, estimateNumber, estimateDate, totalAmount, status FROM estimates WHERE organizationId = ? AND customerId = ? AND del_flag = 0 ORDER BY estimateDate DESC`, [orgId, custId]);

  const totalInvoiced = invoices.reduce((s: number, i: any) => s + (i.totalAmount || 0), 0);
  const totalPaid = invoices.reduce((s: number, i: any) => s + (i.paidAmount || 0), 0);
  const totalOutstanding = totalInvoiced - totalPaid;

  res.json({
    invoices,
    payments,
    creditNotes,
    estimates,
    summary: { totalInvoiced, totalPaid, totalOutstanding, invoiceCount: invoices.length, paymentCount: payments.length },
  });
});
