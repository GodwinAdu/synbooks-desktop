/**
 * Bills API Routes
 * Full CRUD for vendor bills, with approve, mark-paid, and record-payment endpoints.
 * Posts to GL on bill creation (Debit Expense, Credit Accounts Payable)
 * and on payment (Debit Payable, Credit Cash).
 */

import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';
import { postBillToGL, postBillPaymentToGL } from '../services/gl-posting';

export const billsRouter = Router();
const billRepo = new Repository<any>('bills');
const vendorRepo = new Repository<any>('vendors');

/**
 * GET /api/bills
 * List all bills for the organization with vendor name enrichment
 */
billsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '20', status, search } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (status && status !== 'all') where.status = status;

  const result = billRepo.findPaginated({
    where,
    orderBy: 'billDate',
    order: 'DESC',
    page: parseInt(page as string),
    pageSize: parseInt(pageSize as string),
  });

  // Enrich with vendor name
  result.data = result.data.map((bill: any) => {
    if (bill.vendorId) {
      const vendor = vendorRepo.findById(bill.vendorId);
      if (vendor) {
        return { ...bill, vendor: { name: vendor.name, id: vendor.id }, vendorName: vendor.name };
      }
    }
    return { ...bill, vendor: null, vendorName: null };
  });

  res.json(result);
});

/**
 * GET /api/bills/:id
 * Get single bill by ID with vendor info
 */
billsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const bill = billRepo.findById(req.params.id);
  if (!bill || bill.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Bill not found' });
    return;
  }

  // Enrich with vendor data
  const vendor = bill.vendorId ? vendorRepo.findById(bill.vendorId) : null;
  res.json({ ...bill, vendor });
});

/**
 * POST /api/bills
 * Create a new bill (auto-generates billNumber BILL-00001)
 */
billsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;

    // Generate bill number
    const count = billRepo.count({ organizationId: req.organizationId });
    const billNumber = data.billNumber || `BILL-${String(count + 1).padStart(5, '0')}`;

    // Calculate totals
    const lineItems = data.lineItems || [];
    const subtotal = lineItems.reduce((s: number, i: any) => s + (i.amount || i.quantity * i.rate), 0);
    const taxAmount = lineItems.reduce((s: number, i: any) => s + (i.taxAmount || 0), 0);
    const totalAmount = subtotal + taxAmount;

    const bill = billRepo.create({
      organizationId: req.organizationId,
      billNumber,
      vendorId: data.vendorId,
      billDate: data.billDate || new Date().toISOString().split('T')[0],
      dueDate: data.dueDate,
      referenceNumber: data.referenceNumber,
      lineItems,
      subtotal,
      taxAmount,
      totalAmount,
      paidAmount: 0,
      status: data.status || 'draft',
      payableAccountId: data.payableAccountId,
      expenseAccountId: data.expenseAccountId,
      projectId: data.projectId,
      notes: data.notes,
      createdBy: req.userId,
    });

    // Auto-post to GL (Debit Expense, Credit Accounts Payable)
    postBillToGL(bill.id, req.organizationId!, bill, req.userId!);

    res.status(201).json({ success: true, data: bill });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/bills/:id
 * Update a bill
 */
billsRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = billRepo.findById(req.params.id);
    if (!existing || existing.organizationId !== req.organizationId) {
      res.status(404).json({ error: 'Bill not found' });
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

    const updated = billRepo.update(req.params.id, data);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/bills/:id
 * Soft delete a bill
 */
billsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = billRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Bill not found' });
    return;
  }

  billRepo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Bill deleted' });
});

/**
 * POST /api/bills/:id/approve
 * Mark a draft bill as approved (open)
 */
billsRouter.post('/:id/approve', (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = billRepo.findById(req.params.id);
    if (!existing || existing.organizationId !== req.organizationId) {
      res.status(404).json({ error: 'Bill not found' });
      return;
    }

    if (existing.status !== 'draft') {
      res.status(400).json({ error: 'Only draft bills can be approved' });
      return;
    }

    const updated = billRepo.update(req.params.id, { status: 'open', modifiedBy: req.userId });
    res.json({ success: true, data: updated, message: 'Bill approved' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/bills/:id/mark-paid
 * Mark bill as fully paid — posts to GL (Debit Payable, Credit Cash)
 */
billsRouter.post('/:id/mark-paid', (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = billRepo.findById(req.params.id);
    if (!existing || existing.organizationId !== req.organizationId) {
      res.status(404).json({ error: 'Bill not found' });
      return;
    }

    if (existing.status === 'paid' || existing.status === 'cancelled') {
      res.status(400).json({ error: `Cannot mark a ${existing.status} bill as paid` });
      return;
    }

    const balance = (existing.totalAmount || 0) - (existing.paidAmount || 0);
    const updated = billRepo.update(req.params.id, {
      paidAmount: existing.totalAmount,
      status: 'paid',
      modifiedBy: req.userId,
    });

    // Post payment to GL (Debit Accounts Payable, Credit Cash)
    if (balance > 0) {
      postBillPaymentToGL(req.params.id, req.organizationId!, existing, balance, req.userId!);
    }

    res.json({ success: true, data: updated, message: 'Bill marked as paid' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/bills/:id/record-payment
 * Record a partial payment against a bill — posts to GL
 */
billsRouter.post('/:id/record-payment', (req: AuthenticatedRequest, res: Response) => {
  try {
    const existing = billRepo.findById(req.params.id);
    if (!existing || existing.organizationId !== req.organizationId) {
      res.status(404).json({ error: 'Bill not found' });
      return;
    }

    const { amount, paymentDate, paymentMethod, reference } = req.body;
    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Invalid payment amount' });
      return;
    }

    const currentPaid = existing.paidAmount || 0;
    const balance = (existing.totalAmount || 0) - currentPaid;

    if (amount > balance + 0.01) {
      res.status(400).json({ error: `Payment amount exceeds outstanding balance of ${balance.toFixed(2)}` });
      return;
    }

    const newPaidAmount = currentPaid + amount;
    const newStatus = newPaidAmount >= existing.totalAmount ? 'paid' : existing.status;

    billRepo.update(req.params.id, {
      paidAmount: newPaidAmount,
      status: newStatus,
      modifiedBy: req.userId,
    });

    // Post payment to GL (Debit Accounts Payable, Credit Cash)
    postBillPaymentToGL(req.params.id, req.organizationId!, existing, amount, req.userId!);

    res.json({
      success: true,
      message: 'Payment recorded',
      paidAmount: newPaidAmount,
      status: newStatus,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/bills/check-overdue
 * Auto-mark open bills past their due date as overdue
 */
billsRouter.post('/check-overdue', (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const openBills = billRepo.find({
      where: { organizationId: req.organizationId, del_flag: 0, status: 'open' },
    });

    let marked = 0;
    for (const bill of openBills) {
      if (bill.dueDate && bill.dueDate < today) {
        billRepo.update(bill.id, { status: 'overdue' });
        marked++;
      }
    }

    res.json({ success: true, marked, message: `${marked} bill(s) marked as overdue` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
