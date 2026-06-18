/**
 * Contracts Routes
 * Field names aligned with cloud IContract model for sync.
 */

import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const contractsRouter = Router();
const repo = new Repository<any>('contracts');

contractsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50', status, search } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (status && status !== 'all') where.status = status;
  if (search) where.title = { $like: search };
  const result = repo.findPaginated({ where, orderBy: 'createdAt', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) });

  // Map cloud fields → display fields for frontend
  result.data = result.data.map((c: any) => {
    let billingSchedule: any = {};
    try { billingSchedule = typeof c.billingSchedule === 'string' ? JSON.parse(c.billingSchedule || '{}') : (c.billingSchedule || {}); } catch {}
    let renewal: any = {};
    try { renewal = typeof c.renewal === 'string' ? JSON.parse(c.renewal || '{}') : (c.renewal || {}); } catch {}

    return {
      ...c,
      // Display aliases for frontend
      value: c.contractValue ?? c.value ?? 0,
      type: c.contractType || c.type || 'standard',
      billingFrequency: billingSchedule.frequency || c.billingFrequency || 'monthly',
      autoRenew: renewal.autoRenew ?? c.autoRenew ?? false,
      customerName: c.customerName || '',
      vendorName: c.vendorName || '',
    };
  });
  res.json(result);
});

contractsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = repo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) { res.status(404).json({ error: 'Contract not found' }); return; }
  res.json(item);
});

contractsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, customerId, customerName, vendorName, type, value, billingFrequency, startDate, endDate, autoRenew, description, terms, lineItems } = req.body;
    const count = repo.count({ organizationId: req.organizationId });
    const contractNumber = req.body.contractNumber || `CON-${String(count + 1).padStart(4, '0')}`;

    // Build cloud-compatible fields
    const billingSchedule = JSON.stringify({
      frequency: billingFrequency || 'monthly',
      autoSend: false,
      prorationEnabled: false,
    });

    const renewal = JSON.stringify({
      autoRenew: autoRenew || false,
      renewalTermMonths: autoRenew ? 12 : undefined,
    });

    const revenueRecognition = JSON.stringify({
      method: 'straight-line',
    });

    const record = repo.create({
      organizationId: req.organizationId,
      contractNumber,
      title,
      customerId: customerId || null,
      customerName: customerName || '',
      description: description || '',
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || null,
      contractValue: parseFloat(value) || 0,
      currency: 'GHS',
      exchangeRate: 1,
      paymentTerms: 'net-30',
      contractType: type === 'retainer' ? 'retainer' : 'standard',
      status: 'draft',
      lineItems: JSON.stringify(lineItems || []),
      billingSchedule,
      renewal,
      revenueRecognition,
      retainer: type === 'retainer' ? JSON.stringify({ initialAmount: parseFloat(value) || 0, currentBalance: parseFloat(value) || 0, lowBalanceThreshold: 20, refundFlagged: false }) : '{}',
      projectId: req.body.projectId || null,
      invoicesGenerated: 0,
      totalBilled: 0,
      createdBy: req.userId,
    });

    res.status(201).json({ success: true, data: record });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

contractsRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Contract not found' }); return; }
  // If frontend sends `value`, map to `contractValue`
  const updates = { ...req.body };
  if ('value' in updates && !('contractValue' in updates)) {
    updates.contractValue = updates.value;
    delete updates.value;
  }
  if ('type' in updates && !('contractType' in updates)) {
    updates.contractType = updates.type === 'retainer' ? 'retainer' : 'standard';
    delete updates.type;
  }
  updates.modifiedBy = req.userId;
  res.json({ success: true, data: repo.update(req.params.id, updates) });
});

contractsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Contract not found' }); return; }
  repo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Contract deleted' });
});

// ─── Status Actions ──────────────────────────────────────────────────────────

contractsRouter.post('/:id/activate', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Contract not found' }); return; }
  repo.update(req.params.id, { status: 'active', modifiedBy: req.userId });
  res.json({ success: true, message: 'Contract activated' });
});

contractsRouter.post('/:id/pause', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Contract not found' }); return; }
  repo.update(req.params.id, { status: 'paused', modifiedBy: req.userId });
  res.json({ success: true, message: 'Contract paused' });
});

contractsRouter.post('/:id/terminate', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Contract not found' }); return; }
  repo.update(req.params.id, {
    status: 'terminated',
    terminationReason: req.body.reason || '',
    terminatedAt: new Date().toISOString(),
    modifiedBy: req.userId,
  });
  res.json({ success: true, message: 'Contract terminated' });
});

contractsRouter.post('/:id/renew', (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = repo.findById(req.params.id);
    if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Contract not found' }); return; }

    // Mark current as renewed
    repo.update(req.params.id, { status: 'renewed', modifiedBy: req.userId });

    // Create new contract as a renewal
    const count = repo.count({ organizationId: req.organizationId });
    const contractNumber = `CON-${String(count + 1).padStart(4, '0')}`;
    const renewalMonths = req.body.renewalTermMonths || 12;
    const newStart = existing.endDate || new Date().toISOString().split('T')[0];
    const newEnd = new Date(new Date(newStart).getTime() + renewalMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let renewal: any = {};
    try { renewal = typeof existing.renewal === 'string' ? JSON.parse(existing.renewal || '{}') : (existing.renewal || {}); } catch {}

    const newContract = repo.create({
      organizationId: req.organizationId,
      contractNumber,
      title: existing.title,
      customerId: existing.customerId,
      customerName: existing.customerName || '',
      description: existing.description || '',
      startDate: newStart,
      endDate: newEnd,
      contractValue: existing.contractValue || 0,
      currency: existing.currency || 'GHS',
      exchangeRate: existing.exchangeRate || 1,
      paymentTerms: existing.paymentTerms || 'net-30',
      contractType: existing.contractType || 'standard',
      status: 'active',
      lineItems: existing.lineItems || '[]',
      billingSchedule: existing.billingSchedule || '{}',
      renewal: JSON.stringify({ ...renewal, autoRenew: renewal.autoRenew, previousContractId: existing.id }),
      revenueRecognition: existing.revenueRecognition || '{}',
      retainer: existing.retainer || '{}',
      projectId: existing.projectId || null,
      invoicesGenerated: 0,
      totalBilled: 0,
      createdBy: req.userId,
    });

    // Update old contract's renewal to point to new one
    const oldRenewal = JSON.stringify({ ...renewal, renewedToContractId: newContract.id });
    repo.update(req.params.id, { renewal: oldRenewal });

    res.json({ success: true, message: `Contract renewed. New contract: ${contractNumber}`, newContractId: newContract.id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
