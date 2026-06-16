import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const payrollRouter = Router();
const repo = new Repository<any>('payroll_runs');
const employeeRepo = new Repository<any>('employees');

payrollRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '20', status } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (status && status !== 'all') where.status = status;
  res.json(repo.findPaginated({ where, orderBy: 'payDate', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) }));
});

payrollRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = repo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) { res.status(404).json({ error: 'Payroll run not found' }); return; }
  res.json(item);
});

payrollRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const count = repo.count({ organizationId: req.organizationId });
    const runNumber = data.runNumber || `PAY-${String(count + 1).padStart(4, '0')}`;
    
    // Map form field names to schema column names
    const item = repo.create({
      organizationId: req.organizationId,
      runNumber,
      payPeriod: data.payPeriod,
      payDate: data.payDate,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status || 'draft',
      employeePayments: data.employees || data.employeePayments || [],
      totalGrossPay: data.totalGross ?? data.totalGrossPay ?? 0,
      totalDeductions: data.totalDeductions ?? 0,
      totalNetPay: data.totalNet ?? data.totalNetPay ?? 0,
      employeeCount: data.employees?.length ?? data.employeeCount ?? 0,
      notes: data.notes,
      createdBy: req.userId,
    });
    res.status(201).json({ success: true, data: item, id: item.id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

payrollRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Payroll run not found' }); return; }
  res.json({ success: true, data: repo.update(req.params.id, { ...req.body, modifiedBy: req.userId }) });
});

payrollRouter.post('/:id/process', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Payroll run not found' }); return; }
  repo.update(req.params.id, { status: 'completed', processedBy: req.userId, processedAt: new Date().toISOString() });
  res.json({ success: true, message: 'Payroll processed' });
});

payrollRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Payroll run not found' }); return; }
  repo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Payroll run deleted' });
});
