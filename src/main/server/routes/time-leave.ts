/**
 * Time Tracking & Leave Management Routes
 */

import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const timeLeaveRouter = Router();
const timeRepo = new Repository<any>('time_entries');
const leaveRepo = new Repository<any>('leave_requests');

// ─── Time Entries ────────────────────────────────────────────────────────────

timeLeaveRouter.get('/time-entries', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '100', employeeId, startDate, endDate, projectId } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (employeeId) where.employeeId = employeeId;
  if (projectId) where.projectId = projectId;
  const result = timeRepo.findPaginated({ where, orderBy: 'date', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) });
  res.json(result);
});

timeLeaveRouter.post('/time-entries', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { employeeId, employeeName, projectId, date, clockIn, clockOut, hours, description, notes, billable } = req.body;
    if (!employeeId || !date) { res.status(400).json({ error: 'Employee and date are required' }); return; }
    const entry = timeRepo.create({
      organizationId: req.organizationId,
      employeeId,
      employeeName: employeeName || '',
      projectId: projectId || null,
      date,
      clockIn: clockIn || null,
      clockOut: clockOut || null,
      hours: hours || 0,
      description: description || notes || '',
      billable: billable !== undefined ? (billable ? 1 : 0) : 1,
      status: 'pending',
      createdBy: req.userId,
    });
    res.status(201).json({ success: true, data: entry });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

timeLeaveRouter.put('/time-entries/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = timeRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Time entry not found' }); return; }
  res.json({ success: true, data: timeRepo.update(req.params.id, { ...req.body, modifiedBy: req.userId }) });
});

timeLeaveRouter.delete('/time-entries/:id', (req: AuthenticatedRequest, res: Response) => {
  timeRepo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Time entry deleted' });
});

timeLeaveRouter.post('/time-entries/:id/approve', (req: AuthenticatedRequest, res: Response) => {
  const existing = timeRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Time entry not found' }); return; }
  timeRepo.update(req.params.id, { status: 'approved', approvedBy: req.userId, modifiedBy: req.userId });
  res.json({ success: true, message: 'Time entry approved' });
});

// ─── Leave Requests ──────────────────────────────────────────────────────────

timeLeaveRouter.get('/leave-requests', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '100', employeeId, status } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (employeeId) where.employeeId = employeeId;
  if (status && status !== 'all') where.status = status;
  const result = leaveRepo.findPaginated({ where, orderBy: 'startDate', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) });
  res.json(result);
});

timeLeaveRouter.post('/leave-requests', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { employeeId, employeeName, leaveType, startDate, endDate, days, reason } = req.body;
    if (!employeeId || !leaveType || !startDate || !endDate) { res.status(400).json({ error: 'Employee, type, and dates are required' }); return; }
    const entry = leaveRepo.create({
      organizationId: req.organizationId,
      employeeId,
      employeeName: employeeName || '',
      leaveType,
      startDate,
      endDate,
      days: days || 1,
      reason: reason || '',
      status: 'pending',
      createdBy: req.userId,
    });
    res.status(201).json({ success: true, data: entry });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

timeLeaveRouter.post('/leave-requests/:id/approve', (req: AuthenticatedRequest, res: Response) => {
  const existing = leaveRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Leave request not found' }); return; }
  leaveRepo.update(req.params.id, { status: 'approved', approvedBy: req.userId, approvedAt: new Date().toISOString(), modifiedBy: req.userId });
  res.json({ success: true, message: 'Leave request approved' });
});

timeLeaveRouter.post('/leave-requests/:id/reject', (req: AuthenticatedRequest, res: Response) => {
  const existing = leaveRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Leave request not found' }); return; }
  leaveRepo.update(req.params.id, { status: 'rejected', modifiedBy: req.userId });
  res.json({ success: true, message: 'Leave request rejected' });
});

timeLeaveRouter.delete('/leave-requests/:id', (req: AuthenticatedRequest, res: Response) => {
  leaveRepo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Leave request deleted' });
});
