import { Router, Response } from 'express';
import { dbAll, dbGet } from '../../database';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId!;

  const revenue = dbGet(`SELECT COALESCE(SUM(totalAmount), 0) as total FROM invoices WHERE organizationId = ? AND del_flag = 0 AND status != 'cancelled'`, [orgId])?.total || 0;
  const expenses = dbGet(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE organizationId = ? AND del_flag = 0 AND status != 'rejected'`, [orgId])?.total || 0;
  const receivables = dbGet(`SELECT COALESCE(SUM(totalAmount - paidAmount), 0) as total FROM invoices WHERE organizationId = ? AND del_flag = 0 AND status IN ('sent', 'overdue')`, [orgId])?.total || 0;
  const payables = dbGet(`SELECT COALESCE(SUM(totalAmount - paidAmount), 0) as total FROM bills WHERE organizationId = ? AND del_flag = 0 AND status NOT IN ('paid', 'cancelled')`, [orgId])?.total || 0;
  const cashBalance = dbGet(`SELECT COALESCE(SUM(currentBalance), 0) as total FROM bank_accounts WHERE organizationId = ? AND del_flag = 0 AND isActive = 1`, [orgId])?.total || 0;

  const customerCount = dbGet(`SELECT COUNT(*) as count FROM customers WHERE organizationId = ? AND del_flag = 0`, [orgId])?.count || 0;
  const productCount = dbGet(`SELECT COUNT(*) as count FROM products WHERE organizationId = ? AND del_flag = 0`, [orgId])?.count || 0;
  const employeeCount = dbGet(`SELECT COUNT(*) as count FROM employees WHERE organizationId = ? AND del_flag = 0 AND status = 'active'`, [orgId])?.count || 0;
  const overdueCount = dbGet(`SELECT COUNT(*) as count FROM invoices WHERE organizationId = ? AND del_flag = 0 AND status = 'overdue'`, [orgId])?.count || 0;

  const recentInvoices = dbAll(`SELECT i.*, c.name as customerName FROM invoices i LEFT JOIN customers c ON i.customerId = c.id WHERE i.organizationId = ? AND i.del_flag = 0 ORDER BY i.createdAt DESC LIMIT 5`, [orgId]);

  res.json({
    revenue, expenses, netIncome: revenue - expenses,
    receivables, payables, cashBalance,
    customerCount, productCount, employeeCount,
    overdueInvoices: overdueCount, recentInvoices,
  });
});

dashboardRouter.get('/charts/revenue', (req: AuthenticatedRequest, res: Response) => {
  const data = dbAll(`SELECT strftime('%Y-%m', invoiceDate) as month, SUM(totalAmount) as revenue FROM invoices WHERE organizationId = ? AND del_flag = 0 AND status != 'cancelled' GROUP BY month ORDER BY month DESC LIMIT 12`, [req.organizationId!]);
  res.json(data.reverse());
});

dashboardRouter.get('/charts/expenses', (req: AuthenticatedRequest, res: Response) => {
  const data = dbAll(`SELECT strftime('%Y-%m', date) as month, SUM(amount) as total FROM expenses WHERE organizationId = ? AND del_flag = 0 AND status != 'rejected' GROUP BY month ORDER BY month DESC LIMIT 12`, [req.organizationId!]);
  res.json(data.reverse());
});
