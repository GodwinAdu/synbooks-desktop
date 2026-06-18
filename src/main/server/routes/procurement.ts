/**
 * Procurement Routes
 * Field names aligned with cloud MongoDB models for proper sync.
 * - Requisitions: uses IPurchaseRequisition model fields
 * - GRN: uses IGoodsReceiptNote model fields
 */

import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const procurementRouter = Router();
const requisitionRepo = new Repository<any>('requisitions');
const grnRepo = new Repository<any>('goods_receipt_notes');
const legacyGrnRepo = new Repository<any>('goods_received');

// ─── Requisitions ────────────────────────────────────────────────────────────

procurementRouter.get('/requisitions', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50', status } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (status && status !== 'all') where.status = status;
  const result = requisitionRepo.findPaginated({ where, orderBy: 'createdAt', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) });
  // Map fields for frontend display
  result.data = result.data.map((r: any) => {
    let items: any[] = [];
    try { items = typeof r.items === 'string' ? JSON.parse(r.items) : (r.items || []); } catch {}
    return {
      ...r,
      items,
      requestedBy: r.requesterId || r.requestedBy || '',
      department: r.department || r.costCenter || '',
      totalAmount: r.totalEstimatedAmount ?? r.totalAmount ?? 0,
      requiredDate: r.requestedDeliveryDate || r.requiredDate || null,
    };
  });
  res.json(result);
});

procurementRouter.get('/requisitions/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = requisitionRepo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) { res.status(404).json({ error: 'Requisition not found' }); return; }
  res.json(item);
});

procurementRouter.post('/requisitions', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { department, items, priority, requiredDate, notes } = req.body;
    const count = requisitionRepo.count({ organizationId: req.organizationId });
    const requisitionNumber = `PR-${String(count + 1).padStart(5, '0')}`;

    // Transform items to cloud format
    const transformedItems = (items || []).map((item: any) => ({
      description: item.productName || item.description || '',
      quantity: item.quantity || 0,
      unitOfMeasure: item.unit || item.unitOfMeasure || 'pcs',
      estimatedUnitPrice: item.estimatedCost || item.estimatedUnitPrice || 0,
      estimatedAmount: (item.quantity || 0) * (item.estimatedCost || item.estimatedUnitPrice || 0),
      preferredVendorId: item.vendorId || item.preferredVendorId || null,
    }));

    const totalEstimatedAmount = transformedItems.reduce((s: number, i: any) => s + (i.estimatedAmount || 0), 0);

    const record = requisitionRepo.create({
      organizationId: req.organizationId,
      requisitionNumber,
      requesterId: req.userId,
      description: notes || `Purchase requisition ${requisitionNumber}`,
      costCenter: department || '',
      department: department || '',
      requestedDeliveryDate: requiredDate || null,
      items: JSON.stringify(transformedItems),
      totalEstimatedAmount,
      status: 'draft',
      priority: priority || 'normal',
      currentApprovalLevel: 0,
      approvalHistory: '[]',
      createdBy: req.userId,
    });

    res.status(201).json({ success: true, data: record });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

procurementRouter.put('/requisitions/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = requisitionRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Requisition not found' }); return; }
  res.json({ success: true, data: requisitionRepo.update(req.params.id, { ...req.body, modifiedBy: req.userId }) });
});

procurementRouter.delete('/requisitions/:id', (req: AuthenticatedRequest, res: Response) => {
  requisitionRepo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Requisition deleted' });
});

// ─── Requisition Status Actions ──────────────────────────────────────────────

procurementRouter.post('/requisitions/:id/approve', (req: AuthenticatedRequest, res: Response) => {
  const existing = requisitionRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Requisition not found' }); return; }

  // Add to approval history (matching cloud model)
  let approvalHistory: any[] = [];
  try { approvalHistory = typeof existing.approvalHistory === 'string' ? JSON.parse(existing.approvalHistory || '[]') : (existing.approvalHistory || []); } catch {}
  approvalHistory.push({
    level: (existing.currentApprovalLevel || 0) + 1,
    approverId: req.userId,
    action: 'approve',
    timestamp: new Date().toISOString(),
    comments: req.body.comments || '',
  });

  requisitionRepo.update(req.params.id, {
    status: 'approved',
    currentApprovalLevel: (existing.currentApprovalLevel || 0) + 1,
    approvalHistory: JSON.stringify(approvalHistory),
    modifiedBy: req.userId,
  });
  res.json({ success: true, message: 'Requisition approved' });
});

procurementRouter.post('/requisitions/:id/reject', (req: AuthenticatedRequest, res: Response) => {
  const existing = requisitionRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Requisition not found' }); return; }

  let approvalHistory: any[] = [];
  try { approvalHistory = typeof existing.approvalHistory === 'string' ? JSON.parse(existing.approvalHistory || '[]') : (existing.approvalHistory || []); } catch {}
  approvalHistory.push({
    level: (existing.currentApprovalLevel || 0) + 1,
    approverId: req.userId,
    action: 'reject',
    timestamp: new Date().toISOString(),
    comments: req.body.reason || '',
  });

  requisitionRepo.update(req.params.id, {
    status: 'rejected',
    rejectionReason: req.body.reason || '',
    approvalHistory: JSON.stringify(approvalHistory),
    modifiedBy: req.userId,
  });
  res.json({ success: true, message: 'Requisition rejected' });
});

procurementRouter.post('/requisitions/:id/convert-to-po', (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = requisitionRepo.findById(req.params.id);
    if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Requisition not found' }); return; }
    if (existing.status !== 'approved') { res.status(400).json({ error: 'Only approved requisitions can be converted' }); return; }

    // Create purchase order from requisition
    const poRepo = new Repository<any>('purchase_orders');
    const poCount = poRepo.count({ organizationId: req.organizationId });
    const poNumber = `PO-${String(poCount + 1).padStart(5, '0')}`;

    let items: any[] = [];
    try { items = typeof existing.items === 'string' ? JSON.parse(existing.items) : (existing.items || []); } catch {}

    const lineItems = items.map((item: any) => ({
      description: item.description || item.productName || '',
      quantity: item.quantity || 0,
      unitPrice: item.estimatedUnitPrice || item.estimatedCost || 0,
      amount: item.estimatedAmount || ((item.quantity || 0) * (item.estimatedUnitPrice || item.estimatedCost || 0)),
    }));

    const totalAmount = lineItems.reduce((s: number, l: any) => s + l.amount, 0);

    const po = poRepo.create({
      organizationId: req.organizationId,
      poNumber,
      vendorId: items[0]?.preferredVendorId || null,
      orderDate: new Date().toISOString().split('T')[0],
      expectedDate: existing.requestedDeliveryDate || null,
      lineItems: JSON.stringify(lineItems),
      subtotal: totalAmount,
      taxAmount: 0,
      totalAmount,
      status: 'draft',
      notes: `Converted from requisition ${existing.requisitionNumber}`,
      createdBy: req.userId,
    });

    // Mark requisition as converted (matching cloud status value)
    requisitionRepo.update(req.params.id, { status: 'converted_to_po', linkedPOId: po.id, modifiedBy: req.userId });

    res.json({ success: true, message: `Purchase Order ${poNumber} created`, poNumber, poId: po.id });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── Goods Receipt Notes (GRN) ───────────────────────────────────────────────

procurementRouter.get('/goods-received', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50', status } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (status && status !== 'all') where.status = status;

  // Try new table first, fallback to legacy
  let result = grnRepo.findPaginated({ where, orderBy: 'createdAt', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) });

  // Also check legacy table and merge
  try {
    const legacyResult = legacyGrnRepo.findPaginated({ where, orderBy: 'createdAt', order: 'DESC', page: 1, pageSize: parseInt(pageSize as string) });
    if (legacyResult.data.length > 0 && result.data.length === 0) {
      result = legacyResult;
    }
  } catch {}

  // Map for frontend display
  result.data = result.data.map((g: any) => {
    let items: any[] = [];
    try { items = typeof g.items === 'string' ? JSON.parse(g.items) : (g.items || []); } catch {}
    return {
      ...g,
      items,
      receivedDate: g.receiptDate || g.receivedDate || '',
      poNumber: g.poNumber || '',
      vendorName: g.vendorName || '',
      // Map status for frontend display
      status: g.status === 'confirmed' ? 'accepted' : g.status === 'draft' ? 'pending_inspection' : g.status,
    };
  });
  res.json(result);
});

procurementRouter.post('/goods-received', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { poNumber, vendorName, receivedDate, items, notes } = req.body;
    const count = grnRepo.count({ organizationId: req.organizationId });
    const grnNumber = `GRN-${String(count + 1).padStart(5, '0')}`;

    // Transform items to cloud format
    const transformedItems = (items || []).map((item: any, idx: number) => ({
      poLineIndex: idx,
      quantityReceived: item.receivedQuantity || item.quantityReceived || 0,
      quantityRejected: item.rejectedQuantity || item.quantityRejected || 0,
      rejectionReason: item.rejectionReason || '',
      // Keep extra fields for display (won't break sync — cloud ignores extras)
      productName: item.productName || '',
      productId: item.productId || null,
      orderedQuantity: item.orderedQuantity || 0,
      acceptedQuantity: item.acceptedQuantity || (item.receivedQuantity || 0) - (item.rejectedQuantity || 0),
      unit: item.unit || 'pcs',
    }));

    // Find PO ID if poNumber is given
    let purchaseOrderId = req.body.purchaseOrderId || null;
    if (!purchaseOrderId && poNumber) {
      const poRepo = new Repository<any>('purchase_orders');
      const po = poRepo.findOne({ organizationId: req.organizationId, poNumber, del_flag: 0 });
      if (po) purchaseOrderId = po.id;
    }

    const record = grnRepo.create({
      organizationId: req.organizationId,
      grnNumber,
      purchaseOrderId,
      receiptDate: receivedDate || new Date().toISOString().split('T')[0],
      receivedBy: req.userId,
      deliveryNoteRef: req.body.deliveryNoteRef || '',
      items: JSON.stringify(transformedItems),
      status: 'draft',
      notes: notes || '',
      // Keep extra fields for frontend convenience
      poNumber: poNumber || '',
      vendorName: vendorName || '',
      createdBy: req.userId,
    });

    res.status(201).json({ success: true, data: record });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

procurementRouter.put('/goods-received/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = grnRepo.findById(req.params.id) || legacyGrnRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'GRN not found' }); return; }
  const repo = grnRepo.findById(req.params.id) ? grnRepo : legacyGrnRepo;
  res.json({ success: true, data: repo.update(req.params.id, { ...req.body, modifiedBy: req.userId }) });
});

procurementRouter.delete('/goods-received/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = grnRepo.findById(req.params.id) || legacyGrnRepo.findById(req.params.id);
  if (!existing) { res.status(404).json({ error: 'GRN not found' }); return; }
  const repo = grnRepo.findById(req.params.id) ? grnRepo : legacyGrnRepo;
  repo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'GRN deleted' });
});

// ─── GRN Status Actions ──────────────────────────────────────────────────────

// Confirm GRN — updates inventory for received items (cloud equivalent of "confirmed" status)
procurementRouter.post('/goods-received/:id/accept', (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = grnRepo.findById(req.params.id) || legacyGrnRepo.findById(req.params.id);
    if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'GRN not found' }); return; }

    const repo = grnRepo.findById(req.params.id) ? grnRepo : legacyGrnRepo;

    // Update status to "confirmed" (cloud model value)
    repo.update(req.params.id, {
      status: 'confirmed',
      confirmedAt: new Date().toISOString(),
      confirmedBy: req.userId,
      modifiedBy: req.userId,
    });

    // Update inventory for items with productId
    let items: any[] = [];
    try { items = typeof existing.items === 'string' ? JSON.parse(existing.items) : (existing.items || []); } catch {}

    const productRepo = new Repository<any>('products');
    let stockUpdated = 0;
    for (const item of items) {
      if (item.productId) {
        const product = productRepo.findById(item.productId);
        if (product && product.trackInventory) {
          const addQty = item.acceptedQuantity || item.quantityReceived || item.receivedQuantity || 0;
          productRepo.update(item.productId, { currentStock: (product.currentStock || 0) + addQty });
          stockUpdated++;
        }
      }
    }

    res.json({ success: true, message: `GRN confirmed. ${stockUpdated} product(s) stock updated.` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Cancel GRN
procurementRouter.post('/goods-received/:id/cancel', (req: AuthenticatedRequest, res: Response) => {
  const existing = grnRepo.findById(req.params.id) || legacyGrnRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'GRN not found' }); return; }

  const repo = grnRepo.findById(req.params.id) ? grnRepo : legacyGrnRepo;
  repo.update(req.params.id, {
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
    cancelledBy: req.userId,
    cancellationReason: req.body.reason || '',
    modifiedBy: req.userId,
  });
  res.json({ success: true, message: 'GRN cancelled' });
});

// ─── Purchase Orders (referenced by procurement, CRUD in purchase-orders route) ─
// This provides an alias so the frontend can also fetch POs from /procurement/purchase-orders
procurementRouter.get('/purchase-orders', (req: AuthenticatedRequest, res: Response) => {
  const poRepo = new Repository<any>('purchase_orders');
  const { page = '1', pageSize = '50', status } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (status && status !== 'all') where.status = status;
  res.json(poRepo.findPaginated({ where, orderBy: 'createdAt', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) }));
});
