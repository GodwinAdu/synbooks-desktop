/**
 * Payments API Routes
 * CRUD for payments received/made. Posts to GL when linked to invoices.
 */

import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';
import { postPaymentToGL } from '../services/gl-posting';

export const paymentsRouter = Router();
const repo = new Repository<any>('payments');
const customerRepo = new Repository<any>('customers');
const invoiceRepo = new Repository<any>('invoices');

paymentsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50', paymentType, customerId } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (paymentType) where.paymentType = paymentType;
  if (customerId) where.customerId = customerId;

  const result = repo.findPaginated({
    where, orderBy: 'paymentDate', order: 'DESC',
    page: parseInt(page as string), pageSize: parseInt(pageSize as string),
  });

  // Enrich with customer and invoice names
  result.data = result.data.map((p: any) => {
    const customer = p.customerId ? customerRepo.findById(p.customerId) : null;
    const invoice = p.invoiceId ? invoiceRepo.findById(p.invoiceId) : null;
    return {
      ...p,
      customerName: customer?.name || '',
      invoiceNumber: invoice?.invoiceNumber || '',
    };
  });

  res.json(result);
});

paymentsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = repo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Payment not found' });
    return;
  }
  const customer = item.customerId ? customerRepo.findById(item.customerId) : null;
  const invoice = item.invoiceId ? invoiceRepo.findById(item.invoiceId) : null;
  res.json({ ...item, customerName: customer?.name, invoiceNumber: invoice?.invoiceNumber });
});

paymentsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const count = repo.count({ organizationId: req.organizationId });
    const paymentNumber = data.paymentNumber || `PAY-${String(count + 1).padStart(5, '0')}`;

    const payment = repo.create({
      ...data,
      organizationId: req.organizationId,
      paymentNumber,
      status: data.status || 'completed',
      createdBy: req.userId,
    });

    // If linked to an invoice, update invoice paidAmount
    if (data.invoiceId && data.amount) {
      const invoice = invoiceRepo.findById(data.invoiceId);
      if (invoice) {
        const newPaid = (invoice.paidAmount || 0) + data.amount;
        const newStatus = newPaid >= invoice.totalAmount ? 'paid' : invoice.status;
        invoiceRepo.update(data.invoiceId, { paidAmount: newPaid, status: newStatus });
      }
    }

    // Post to GL (Debit Bank/Cash, Credit Receivable)
    try {
      postPaymentToGL(payment.id, req.organizationId!, {
        amount: data.amount,
        paymentDate: data.paymentDate || new Date().toISOString().split('T')[0],
        paymentNumber,
      }, req.userId!);
    } catch (glErr: any) {
      console.warn('[GL] Payment posting warning:', glErr.message);
    }

    res.status(201).json({ success: true, data: payment });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

paymentsRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Payment not found' });
    return;
  }
  const updated = repo.update(req.params.id, { ...req.body, modifiedBy: req.userId });
  res.json({ success: true, data: updated });
});

paymentsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) {
    res.status(404).json({ error: 'Payment not found' });
    return;
  }
  repo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Payment deleted' });
});
