import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const projectsRouter = Router();
const repo = new Repository<any>('projects');
const taskRepo = new Repository<any>('project_tasks');

projectsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '20', status } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (status && status !== 'all') where.status = status;
  const result = repo.findPaginated({ where, orderBy: 'createdAt', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) });
  // Map columns for frontend
  result.data = result.data.map((p: any) => ({
    ...p,
    actualCost: p.spent ?? p.actualCost ?? 0,
    completionPercentage: p.progress ?? p.completionPercentage ?? 0,
    revenue: p.revenue ?? 0,
  }));
  res.json(result);
});

projectsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = repo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) { res.status(404).json({ error: 'Project not found' }); return; }
  res.json(item);
});

projectsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { actualCost, completionPercentage, ...rest } = req.body;
    const count = repo.count({ organizationId: req.organizationId });
    const projectNumber = rest.projectNumber || `PRJ-${String(count + 1).padStart(4, '0')}`;
    const item = repo.create({
      ...rest,
      projectNumber,
      spent: actualCost ?? rest.spent ?? 0,
      progress: completionPercentage ?? rest.progress ?? 0,
      organizationId: req.organizationId,
      createdBy: req.userId,
    });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

projectsRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Project not found' }); return; }
  res.json({ success: true, data: repo.update(req.params.id, { ...req.body, modifiedBy: req.userId }) });
});

projectsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Project not found' }); return; }
  repo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Project deleted' });
});

// ─── Team Members ───────────────────────────────────────────────────────────

projectsRouter.get('/:id/team', (req: AuthenticatedRequest, res: Response) => {
  const project = repo.findById(req.params.id);
  if (!project || project.organizationId !== req.organizationId) { res.status(404).json({ error: 'Project not found' }); return; }
  let teamMembers: any[] = [];
  try { teamMembers = typeof project.teamMembers === 'string' ? JSON.parse(project.teamMembers || '[]') : (project.teamMembers || []); } catch {}
  // Also include legacy `members` field if teamMembers is empty
  if (teamMembers.length === 0 && project.members) {
    try { teamMembers = typeof project.members === 'string' ? JSON.parse(project.members || '[]') : (project.members || []); } catch {}
  }
  res.json({ data: teamMembers.filter((m: any) => m.isActive !== false) });
});

projectsRouter.post('/:id/team', (req: AuthenticatedRequest, res: Response) => {
  try {
    const project = repo.findById(req.params.id);
    if (!project || project.organizationId !== req.organizationId) { res.status(404).json({ error: 'Project not found' }); return; }

    const { userId, userName, role, hourlyRate } = req.body;
    if (!userId) { res.status(400).json({ error: 'userId is required' }); return; }

    let teamMembers: any[] = [];
    try { teamMembers = typeof project.teamMembers === 'string' ? JSON.parse(project.teamMembers || '[]') : (project.teamMembers || []); } catch {}

    // Check duplicate
    const exists = teamMembers.find((m: any) => m.userId === userId && m.isActive !== false);
    if (exists) { res.status(409).json({ error: 'User is already a team member' }); return; }

    const newMember = {
      id: require('crypto').randomUUID(),
      userId,
      userName: userName || '',
      role: role || 'member',
      hourlyRate: hourlyRate || 0,
      joinedDate: new Date().toISOString(),
      isActive: true,
    };
    teamMembers.push(newMember);

    repo.update(req.params.id, { teamMembers: JSON.stringify(teamMembers), modifiedBy: req.userId });
    res.status(201).json({ success: true, data: newMember });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

projectsRouter.delete('/:id/team/:memberId', (req: AuthenticatedRequest, res: Response) => {
  const project = repo.findById(req.params.id);
  if (!project || project.organizationId !== req.organizationId) { res.status(404).json({ error: 'Project not found' }); return; }

  let teamMembers: any[] = [];
  try { teamMembers = typeof project.teamMembers === 'string' ? JSON.parse(project.teamMembers || '[]') : (project.teamMembers || []); } catch {}

  const memberIdx = teamMembers.findIndex((m: any) => m.id === req.params.memberId);
  if (memberIdx === -1) { res.status(404).json({ error: 'Member not found' }); return; }

  // Can't remove manager
  if (teamMembers[memberIdx].userId === project.managerId) {
    res.status(400).json({ error: 'Cannot remove the project manager. Change the manager first.' }); return;
  }

  teamMembers[memberIdx].isActive = false;
  teamMembers[memberIdx].removedDate = new Date().toISOString();

  repo.update(req.params.id, { teamMembers: JSON.stringify(teamMembers), modifiedBy: req.userId });
  res.json({ success: true, message: 'Team member removed' });
});

// ─── Milestones ─────────────────────────────────────────────────────────────

projectsRouter.get('/:id/milestones', (req: AuthenticatedRequest, res: Response) => {
  const project = repo.findById(req.params.id);
  if (!project || project.organizationId !== req.organizationId) { res.status(404).json({ error: 'Project not found' }); return; }
  let milestones: any[] = [];
  try { milestones = typeof project.milestones === 'string' ? JSON.parse(project.milestones || '[]') : (project.milestones || []); } catch {}
  res.json({ data: milestones });
});

projectsRouter.post('/:id/milestones', (req: AuthenticatedRequest, res: Response) => {
  try {
    const project = repo.findById(req.params.id);
    if (!project || project.organizationId !== req.organizationId) { res.status(404).json({ error: 'Project not found' }); return; }

    const { title, description, dueDate, amount } = req.body;
    if (!title) { res.status(400).json({ error: 'Title is required' }); return; }

    let milestones: any[] = [];
    try { milestones = typeof project.milestones === 'string' ? JSON.parse(project.milestones || '[]') : (project.milestones || []); } catch {}

    const newMilestone = {
      id: require('crypto').randomUUID(),
      title,
      description: description || '',
      dueDate: dueDate || null,
      completedDate: null,
      status: 'pending',
      amount: amount || 0,
      invoiced: false,
    };
    milestones.push(newMilestone);

    repo.update(req.params.id, { milestones: JSON.stringify(milestones), modifiedBy: req.userId });
    res.status(201).json({ success: true, data: newMilestone });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

projectsRouter.put('/:id/milestones/:milestoneId', (req: AuthenticatedRequest, res: Response) => {
  const project = repo.findById(req.params.id);
  if (!project || project.organizationId !== req.organizationId) { res.status(404).json({ error: 'Project not found' }); return; }

  let milestones: any[] = [];
  try { milestones = typeof project.milestones === 'string' ? JSON.parse(project.milestones || '[]') : (project.milestones || []); } catch {}

  const idx = milestones.findIndex((m: any) => m.id === req.params.milestoneId);
  if (idx === -1) { res.status(404).json({ error: 'Milestone not found' }); return; }

  const { title, description, dueDate, amount, status } = req.body;

  // Block completing if linked tasks incomplete
  if (status === 'completed') {
    const tasks = taskRepo.find({ where: { organizationId: req.organizationId, projectId: req.params.id, del_flag: 0 } });
    // If tasks have milestoneId field, check those
    const linkedTasks = tasks.filter((t: any) => t.milestoneId === req.params.milestoneId);
    const incomplete = linkedTasks.filter((t: any) => t.status !== 'done' && t.status !== 'completed');
    if (incomplete.length > 0) {
      res.status(400).json({ error: `Cannot complete milestone — ${incomplete.length} linked task(s) still incomplete` }); return;
    }
    milestones[idx].completedDate = new Date().toISOString();
  }

  if (title !== undefined) milestones[idx].title = title;
  if (description !== undefined) milestones[idx].description = description;
  if (dueDate !== undefined) milestones[idx].dueDate = dueDate;
  if (amount !== undefined) milestones[idx].amount = amount;
  if (status) milestones[idx].status = status;

  repo.update(req.params.id, { milestones: JSON.stringify(milestones), modifiedBy: req.userId });

  // Recalculate project completion from milestones
  const completed = milestones.filter((m: any) => m.status === 'completed').length;
  if (milestones.length > 0) {
    const pct = Math.round((completed / milestones.length) * 100);
    repo.update(req.params.id, { completionPercentage: pct, progress: pct });
  }

  res.json({ success: true, data: milestones[idx] });
});

projectsRouter.delete('/:id/milestones/:milestoneId', (req: AuthenticatedRequest, res: Response) => {
  const project = repo.findById(req.params.id);
  if (!project || project.organizationId !== req.organizationId) { res.status(404).json({ error: 'Project not found' }); return; }

  let milestones: any[] = [];
  try { milestones = typeof project.milestones === 'string' ? JSON.parse(project.milestones || '[]') : (project.milestones || []); } catch {}

  const filtered = milestones.filter((m: any) => m.id !== req.params.milestoneId);
  if (filtered.length === milestones.length) { res.status(404).json({ error: 'Milestone not found' }); return; }

  repo.update(req.params.id, { milestones: JSON.stringify(filtered), modifiedBy: req.userId });
  res.json({ success: true, message: 'Milestone deleted' });
});

// ─── Project Tasks ──────────────────────────────────────────────────────────

projectsRouter.get('/:id/tasks', (req: AuthenticatedRequest, res: Response) => {
  const project = repo.findById(req.params.id);
  if (!project || project.organizationId !== req.organizationId) { res.status(404).json({ error: 'Project not found' }); return; }
  const tasks = taskRepo.find({ where: { organizationId: req.organizationId, projectId: req.params.id, del_flag: 0 }, orderBy: 'sortOrder', order: 'ASC' });
  res.json({ data: tasks });
});

projectsRouter.post('/:id/tasks', (req: AuthenticatedRequest, res: Response) => {
  try {
    const project = repo.findById(req.params.id);
    if (!project || project.organizationId !== req.organizationId) { res.status(404).json({ error: 'Project not found' }); return; }
    const task = taskRepo.create({
      ...req.body,
      projectId: req.params.id,
      organizationId: req.organizationId,
      createdBy: req.userId,
    });
    res.status(201).json({ success: true, data: task });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

projectsRouter.put('/:id/tasks/:taskId', (req: AuthenticatedRequest, res: Response) => {
  const task = taskRepo.findById(req.params.taskId);
  if (!task || task.organizationId !== req.organizationId || task.projectId !== req.params.id) {
    res.status(404).json({ error: 'Task not found' }); return;
  }
  const updated = taskRepo.update(req.params.taskId, req.body);
  res.json({ success: true, data: updated });
});

projectsRouter.delete('/:id/tasks/:taskId', (req: AuthenticatedRequest, res: Response) => {
  const task = taskRepo.findById(req.params.taskId);
  if (!task || task.organizationId !== req.organizationId || task.projectId !== req.params.id) {
    res.status(404).json({ error: 'Task not found' }); return;
  }
  taskRepo.softDelete(req.params.taskId, req.userId);
  res.json({ success: true, message: 'Task deleted' });
});
