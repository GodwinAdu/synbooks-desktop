import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';
import { checkPlanLimit } from '../middleware/plan-limits';

export const employeesRouter = Router();
const repo = new Repository<any>('employees');

employeesRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50', status, department, search } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (status && status !== 'all') where.status = status;
  if (department) where.department = department;
  if (search) where.name = { $like: search };
  res.json(repo.findPaginated({ where, orderBy: 'name', order: 'ASC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) }));
});

employeesRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = repo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) { res.status(404).json({ error: 'Employee not found' }); return; }
  res.json(item);
});

employeesRouter.post('/', checkPlanLimit('employees'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const count = repo.count({ organizationId: req.organizationId });
    const employeeNumber = data.employeeNumber || `EMP-${String(count + 1).padStart(4, '0')}`;
    
    // Map baseSalary to salary as well for backward compatibility
    const salary = data.baseSalary ?? data.salary ?? 0;
    const fullName = data.name || data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim();
    
    const item = repo.create({ 
      ...data, 
      organizationId: req.organizationId, 
      employeeNumber, 
      salary,
      fullName,
      createdBy: req.userId 
    });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

employeesRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Employee not found' }); return; }
  res.json({ success: true, data: repo.update(req.params.id, { ...req.body, modifiedBy: req.userId }) });
});

employeesRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Employee not found' }); return; }
  repo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Employee deleted' });
});
