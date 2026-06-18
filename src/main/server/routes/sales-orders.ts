/**
 * Sales Orders API Routes
 * CRUD + status transitions: confirm, convert to invoice.
 */

import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const salesOrdersRouter = Router();
const repo = new Repository<any>('sales_orders');
const customerRepo = new Repository<any>('customers');
const invoiceRepo = new Repository<any>('invoices');

// GET / — list with customer enrichment
salesOrdersRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50', status, customerId } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (status) where.status = status;
  if (customerId) where.customerId = customerId;

  const result = repo.findPaginated({
    where, orderBy: 'orderDate', order: 'DESC',
    page: parseInt(page as string), pageSize: parseInt(pageSize as string),
  });

  result.data = result.data.map((order: any) => {
    const customer = order.customerId ? customerRepo.findById(order.customerId) : null;
    return {
      ...order,
      customerName: customer?.name || '',
    };
  });

  res.json(result);
});

// GET /:id — single with enrichment
salesOrdersRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = repo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Sales order not found' });
    return;
  }
  const customer = item.customerId ? customerRepo.findById(item.customerId) : null;
  res.json({ ...item, customerName: customer?.name });
});

// POST / — create (auto-generate orderNumber SO-00001)
salesOrdersRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const count = repo.count({ organizationId: req.organizationId });
    const orderNumber = data.orderNumber || `SO-${String(count + 1).padStart(5, '0')}`;

    const order = repo.create({
      ...data,
      organizationId: req.organizationId,
      orderNumber,
      status: data.status || 'draft',
      createdBy: req.userId,
    });

    res.status(201).json({ success: true, data: order });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /:id — update
salesOrdersRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Sales order not found' });
    return;
  }
  const updated = repo.update(req.params.id, { ...req.body, modifiedBy: req.userId });
  res.json({ success: true, data: updated });
});

// DELETE /:id — soft delete
salesOrdersRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Sales order not found' });
    return;
  }
  repo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Sales order deleted' });
});

// POST /:id/confirm — mark as confirmed
salesOrdersRouter.post('/:id/confirm', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Sales order not found' });
    return;
  }
  if (existing.status !== 'draft') {
    res.status(400).json({ error: 'Only draft orders can be confirmed' });
    return;
  }
  const updated = repo.update(req.params.id, { status: 'confirmed', modifiedBy: req.userId });
  res.json({ success: true, data: updated });
});

// POST /:id/convert — convert to invoice (create draft invoice from order)
salesOrdersRouter.post('/:id/convert', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Sales order not found' });
    return;
  }
  if (existing.status !== 'confirmed') {
    res.status(400).json({ error: 'Only confirmed orders can be converted to invoices' });
    return;
  }

  try {
    // Generate invoice number
    const invoiceCount = invoiceRepo.count({ organizationId: req.organizationId });
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(5, '0')}`;

    // Create invoice from order data
    const invoice = invoiceRepo.create({
      organizationId: req.organizationId,
      invoiceNumber,
      customerId: existing.customerId,
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      lineItems: existing.lineItems || [],
      subtotal: existing.subtotal || 0,
      taxAmount: existing.taxAmount || 0,
      totalAmount: existing.totalAmount || 0,
      paidAmount: 0,
      status: 'draft',
      notes: `Created from Sales Order ${existing.orderNumber}`,
      createdBy: req.userId,
    });

    // Mark order as fulfilled
    repo.update(req.params.id, { status: 'fulfilled', modifiedBy: req.userId });

    res.json({ success: true, data: invoice, message: `Invoice ${invoiceNumber} created from order` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /:id/cancel — cancel the order
salesOrdersRouter.post('/:id/cancel', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Sales order not found' });
    return;
  }
  if (existing.status === 'fulfilled') {
    res.status(400).json({ error: 'Cannot cancel a fulfilled order' });
    return;
  }
  if (existing.status === 'cancelled') {
    res.status(400).json({ error: 'Order is already cancelled' });
    return;
  }
  const updated = repo.update(req.params.id, { status: 'cancelled', modifiedBy: req.userId });
  res.json({ success: true, data: updated });
});
