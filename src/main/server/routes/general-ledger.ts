import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';
import { getDB, dbAll, dbGet } from '../../database';

export const generalLedgerRouter = Router();
const glRepo = new Repository<any>('general_ledger');

generalLedgerRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { accountId, startDate, endDate, page = '1', pageSize = '50' } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (accountId) where.accountId = accountId;

  let entries = glRepo.findPaginated({
    where, orderBy: 'transactionDate', order: 'DESC',
    page: parseInt(page as string), pageSize: parseInt(pageSize as string),
  });

  res.json(entries);
});

generalLedgerRouter.get('/trial-balance', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const { asOfDate } = req.query;

  const query = `
    SELECT a.id, a.accountCode, a.accountName, a.accountType, a.accountSubType,
           a.debitBalance, a.creditBalance, a.currentBalance
    FROM accounts a
    WHERE a.organizationId = ? AND a.del_flag = 0 AND a.isActive = 1
    ORDER BY a.accountCode ASC
  `;

  const accounts = dbAll(query, [req.organizationId]);

  const totalDebits = accounts.reduce((sum, a) => sum + (a.debitBalance || 0), 0);
  const totalCredits = accounts.reduce((sum, a) => sum + (a.creditBalance || 0), 0);

  res.json({
    accounts,
    totals: { totalDebits, totalCredits, difference: totalDebits - totalCredits },
    asOfDate: asOfDate || new Date().toISOString(),
  });
});

generalLedgerRouter.get('/balance-sheet', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const query = `
    SELECT accountType, SUM(currentBalance) as total
    FROM accounts
    WHERE organizationId = ? AND del_flag = 0 AND isActive = 1
    GROUP BY accountType
  `;
  const rows = dbAll(query, [req.organizationId]);
  const data: Record<string, number> = {};
  rows.forEach(r => { data[r.accountType] = r.total; });

  res.json({
    assets: data.asset || 0,
    liabilities: data.liability || 0,
    equity: data.equity || 0,
    revenue: data.revenue || 0,
    expenses: data.expense || 0,
  });
});

generalLedgerRouter.get('/income-statement', (req: AuthenticatedRequest, res: Response) => {
  const db = getDB();
  const { startDate, endDate } = req.query;

  const revenueQuery = `
    SELECT a.accountName, SUM(gl.credit - gl.debit) as amount
    FROM general_ledger gl JOIN accounts a ON gl.accountId = a.id
    WHERE gl.organizationId = ? AND a.accountType = 'revenue' AND gl.del_flag = 0
    ${startDate ? 'AND gl.transactionDate >= ?' : ''}
    ${endDate ? 'AND gl.transactionDate <= ?' : ''}
    GROUP BY a.id ORDER BY amount DESC
  `;
  const params: any[] = [req.organizationId];
  if (startDate) params.push(startDate);
  if (endDate) params.push(endDate);

  const revenue = dbAll(revenueQuery, params);

  const expenseQuery = revenueQuery.replace("'revenue'", "'expense'").replace('gl.credit - gl.debit', 'gl.debit - gl.credit');
  const expenses = dbAll(expenseQuery, params);

  const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);

  res.json({ revenue, expenses, totalRevenue, totalExpenses, netIncome: totalRevenue - totalExpenses });
});
