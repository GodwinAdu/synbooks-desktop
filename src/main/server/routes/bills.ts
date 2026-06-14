import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';
import { postBillToGL } from '../services/gl-posting';

export const billsRouter = Router();
const billRepo = new Repository<any>('bills');

billsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '20', status } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (status && status !== 'all') where.status = status;
  res.json(billRepo.findPaginated({ where, orderBy: 'billDate', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) }));
});

billsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const bill = billRepo.findById(req.params.id);
  if (!bill || bill.organizationId !== req.organizationId) { res.status(404).json({ error: 'Bill not found' }); return; }
  res.json(bill);
});

billsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const count = billRepo.count({ organizationId: req.organizationId });
    const billNumber = data.billNumber || `BILL-${String(count + 1).padStart(5, '0')}`;
    const lineItems = data.lineItems || [];
    const subtotal = lineItems.reduce((s: number, i: any) => s + (i.amount || i.quantity * i.rate), 0);
    const taxAmount = lineItems.reduce((s: number, i: any) => s + (i.taxAmount || 0), 0);

    const bill = billRepo.create({ ...data, organizationId: req.organizationId, billNumber, lineItems, subtotal, taxAmount, totalAmount: subtotal + taxAmount, paidAmount: 0, createdBy: req.userId });

    // Auto-post to GL (Debit Expense, Credit Accounts Payable)
    postBillToGL(bill.id, req.organizationId!, bill, req.userId!);

    res.status(201).json({ success: true, data: bill });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

billsRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = billRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Bill not found' }); return; }
  const updated = billRepo.update(req.params.id, { ...req.body, modifiedBy: req.userId });
  res.json({ success: true, data: updated });
});

billsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = billRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Bill not found' }); return; }
  billRepo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Bill deleted' });
});
