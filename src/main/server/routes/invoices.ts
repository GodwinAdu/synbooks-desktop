/**
 * Invoices API Routes
 * Full CRUD for invoices, working against local SQLite.
 * Auto-posts to GL when invoice is sent.
 */

import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';
import { checkPlanLimit } from '../middleware/plan-limits';
import { postInvoiceToGL, postPaymentToGL } from '../services/gl-posting';

export const invoicesRouter = Router();

const invoiceRepo = new Repository<any>('invoices');
const customerRepo = new Repository<any>('customers');
const accountRepo = new Repository<any>('accounts');

/**
 * GET /api/invoices
 * List all invoices for the organization
 */
invoicesRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '20', status, customerId, search } = req.query;
  const where: Record<string, any> = {
    organizationId: req.organizationId,
    del_flag: 0,
  };

  if (status && status !== 'all') where.status = status;
  if (customerId) where.customerId = customerId;

  const result = invoiceRepo.findPaginated({
    where,
    orderBy: 'invoiceDate',
    order: 'DESC',
    page: parseInt(page as string),
    pageSize: parseInt(pageSize as string),
  });

  res.json(result);
});

/**
 * GET /api/invoices/:id
 * Get single invoice by ID
 */
invoicesRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const invoice = invoiceRepo.findById(req.params.id);
  if (!invoice || invoice.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  // Enrich with customer data
  const customer = invoice.customerId ? customerRepo.findById(invoice.customerId) : null;

  res.json({ ...invoice, customer });
});

/**
 * POST /api/invoices
 * Create a new invoice
 */
invoicesRouter.post('/', checkPlanLimit('invoices'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;

    // Generate invoice number
    const count = invoiceRepo.count({ organizationId: req.organizationId });
    const invoiceNumber = data.invoiceNumber || `INV-${String(count + 1).padStart(5, '0')}`;

    // Calculate totals
    const lineItems = data.lineItems || [];
    const subtotal = lineItems.reduce((sum: number, item: any) => sum + (item.amount || item.quantity * item.rate), 0);
    const taxAmount = lineItems.reduce((sum: number, item: any) => sum + (item.taxAmount || 0), 0);
    const totalAmount = subtotal + taxAmount;

    const invoice = invoiceRepo.create({
      organizationId: req.organizationId,
      invoiceNumber,
      customerId: data.customerId,
      invoiceDate: data.invoiceDate || new Date().toISOString(),
      dueDate: data.dueDate,
      lineItems,
      subtotal,
      taxRate: data.taxRate || 0,
      taxAmount,
      totalAmount,
      paidAmount: 0,
      status: data.status || 'draft',
      revenueAccountId: data.revenueAccountId,
      receivableAccountId: data.receivableAccountId,
      taxAccountId: data.taxAccountId,
      projectId: data.projectId,
      contractId: data.contractId,
      notes: data.notes,
      terms: data.terms,
      createdBy: req.userId,
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/invoices/:id
 * Update an invoice
 */
invoicesRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = invoiceRepo.findById(req.params.id);
    if (!existing || existing.organizationId !== req.organizationId) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const data = req.body;

    // Recalculate totals if lineItems changed
    if (data.lineItems) {
      data.subtotal = data.lineItems.reduce((sum: number, item: any) => sum + (item.amount || item.quantity * item.rate), 0);
      data.taxAmount = data.lineItems.reduce((sum: number, item: any) => sum + (item.taxAmount || 0), 0);
      data.totalAmount = data.subtotal + data.taxAmount;
    }

    data.modifiedBy = req.userId;

    const updated = invoiceRepo.update(req.params.id, data);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/invoices/:id
 * Soft delete an invoice
 */
invoicesRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = invoiceRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  invoiceRepo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Invoice deleted' });
});

/**
 * POST /api/invoices/:id/send
 * Mark invoice as sent
 */
invoicesRouter.post('/:id/send', (req: AuthenticatedRequest, res: Response) => {
  const existing = invoiceRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  invoiceRepo.update(req.params.id, { status: 'sent', modifiedBy: req.userId });

  // Auto-post to General Ledger (same as cloud backend)
  const glResult = postInvoiceToGL(req.params.id, req.organizationId!, existing, req.userId!);
  if (!glResult.success) {
    console.warn(`[GL] Invoice ${existing.invoiceNumber} GL posting failed`);
  }

  res.json({ success: true, message: 'Invoice marked as sent', glPosted: glResult.success });
});

/**
 * POST /api/invoices/:id/record-payment
 * Record a payment against an invoice
 */
invoicesRouter.post('/:id/record-payment', (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = invoiceRepo.findById(req.params.id);
    if (!existing || existing.organizationId !== req.organizationId) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }

    const { amount, paymentDate, paymentMethod, reference } = req.body;
    const newPaidAmount = (existing.paidAmount || 0) + amount;
    const newStatus = newPaidAmount >= existing.totalAmount ? 'paid' : existing.status;

    invoiceRepo.update(req.params.id, {
      paidAmount: newPaidAmount,
      status: newStatus,
      modifiedBy: req.userId,
    });

    // Auto-post payment to GL (Debit Bank, Credit Receivable)
    const paymentId = `pay-${req.params.id}-${Date.now()}`;
    postPaymentToGL(paymentId, req.organizationId!, {
      amount,
      paymentDate: paymentDate || new Date().toISOString().split("T")[0],
      paymentNumber: reference || `PAY-${existing.invoiceNumber}`,
    }, req.userId!);

    res.json({ success: true, message: 'Payment recorded', paidAmount: newPaidAmount, status: newStatus });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
