/**
 * Recurring Expenses API Routes
 * CRUD for recurring expense templates.
 */

import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const recurringExpensesRouter = Router();
const repo = new Repository<any>('recurring_expenses');
const vendorRepo = new Repository<any>('vendors');

recurringExpensesRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50' } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };

  const result = repo.findPaginated({
    where, orderBy: 'createdAt', order: 'DESC',
    page: parseInt(page as string), pageSize: parseInt(pageSize as string),
  });

  // Enrich with vendor name
  result.data = result.data.map((t: any) => {
    const vendor = t.vendorId ? vendorRepo.findById(t.vendorId) : null;
    return {
      ...t,
      vendorName: vendor?.name || t.vendorName || '',
      nextExpenseDate: t.nextRunDate || t.startDate,
    };
  });

  res.json(result);
});

recurringExpensesRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = repo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Recurring expense not found' });
    return;
  }
  // Enrich with vendor name
  const vendor = item.vendorId ? vendorRepo.findById(item.vendorId) : null;
  res.json({ ...item, vendorName: vendor?.name || '' });
});

recurringExpensesRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    // Auto-generate number
    const count = repo.count({ organizationId: req.organizationId });
    const number = `RE-${String(count + 1).padStart(5, '0')}`;

    const item = repo.create({
      ...req.body,
      number,
      organizationId: req.organizationId,
      createdBy: req.userId,
    });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

recurringExpensesRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Recurring expense not found' });
    return;
  }
  const updated = repo.update(req.params.id, { ...req.body, modifiedBy: req.userId });
  res.json({ success: true, data: updated });
});

recurringExpensesRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Recurring expense not found' });
    return;
  }
  repo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Recurring expense deleted' });
});

/**
 * POST /api/recurring-expenses/:id/generate
 * Manually generate a draft expense from this recurring template right now
 */
recurringExpensesRouter.post('/:id/generate', (req: AuthenticatedRequest, res: Response) => {
  try {
    const template = repo.findById(req.params.id);
    if (!template || template.organizationId !== req.organizationId) {
      res.status(404).json({ error: 'Recurring expense not found' });
      return;
    }

    const expenseRepo = new Repository<any>('expenses');
    const today = new Date().toISOString().split('T')[0];

    // Generate expense number
    const count = expenseRepo.count({ organizationId: req.organizationId });
    const expenseNumber = `EXP-${String(count + 1).padStart(5, '0')}`;

    // Create draft expense
    const expense = expenseRepo.create({
      organizationId: req.organizationId,
      expenseNumber,
      vendorId: template.vendorId || null,
      categoryId: template.categoryId || null,
      category: template.category || '',
      amount: template.amount || 0,
      date: today,
      status: 'draft',
      description: template.name || '',
      notes: `Auto-generated from recurring expense: ${template.name || ''}`,
      createdBy: req.userId,
    });

    // Update template's lastGeneratedAt and advance nextRunDate
    const nextDate = calculateNextRunDate(template.nextRunDate || today, template.frequency);
    const now = new Date().toISOString();

    const updateData: any = {
      lastGeneratedAt: now,
      nextRunDate: nextDate,
      modifiedBy: req.userId,
    };

    // If past endDate, deactivate
    if (template.endDate && nextDate > template.endDate) {
      updateData.isActive = 0;
    }

    repo.update(template.id, updateData);

    res.json({ success: true, data: expense, message: 'Draft expense generated' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

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
