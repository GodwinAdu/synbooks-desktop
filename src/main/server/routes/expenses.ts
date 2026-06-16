/**
 * Expenses API Routes
 */

import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';
import { postExpenseToGL } from '../services/gl-posting';

export const expensesRouter = Router();
const expenseRepo = new Repository<any>('expenses');

expensesRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '20', status, vendorId, projectId } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (status && status !== 'all') where.status = status;
  if (vendorId) where.vendorId = vendorId;
  if (projectId) where.projectId = projectId;

  const result = expenseRepo.findPaginated({
    where, orderBy: 'date', order: 'DESC',
    page: parseInt(page as string), pageSize: parseInt(pageSize as string),
  });
  res.json(result);
});

expensesRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const expense = expenseRepo.findById(req.params.id);
  if (!expense || expense.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Expense not found' });
    return;
  }
  res.json(expense);
});

expensesRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const count = expenseRepo.count({ organizationId: req.organizationId });
    const expenseNumber = data.expenseNumber || `EXP-${String(count + 1).padStart(5, '0')}`;

    const expense = expenseRepo.create({
      ...data,
      organizationId: req.organizationId,
      expenseNumber,
      createdBy: req.userId,
    });
    res.status(201).json({ success: true, data: expense });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

expensesRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = expenseRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Expense not found' });
    return;
  }
  const updated = expenseRepo.update(req.params.id, { ...req.body, modifiedBy: req.userId });
  res.json({ success: true, data: updated });
});

expensesRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = expenseRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Expense not found' });
    return;
  }
  expenseRepo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Expense deleted' });
});

expensesRouter.post('/:id/approve', (req: AuthenticatedRequest, res: Response) => {
  const existing = expenseRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Expense not found' });
    return;
  }
  expenseRepo.update(req.params.id, { status: 'approved', approvedBy: req.userId, approvedAt: new Date().toISOString() });

  // Auto-post to GL (Debit Expense, Credit Bank/Cash)
  postExpenseToGL(req.params.id, req.organizationId!, existing, req.userId!);

  res.json({ success: true, message: 'Expense approved' });
});
