import { Router, Response } from 'express';
import { dbAll, dbGet } from '../../database';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const reportsRouter = Router();

// ─── Income Statement (Profit & Loss) ───────────────────────────────────────
reportsRouter.get('/profit-loss', (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate } = req.query;
  const orgId = req.organizationId;
  const params: any[] = [orgId];
  let dateFilter = '';
  if (startDate) { dateFilter += ' AND gl.transactionDate >= ?'; params.push(startDate); }
  if (endDate) { dateFilter += ' AND gl.transactionDate <= ?'; params.push(endDate); }

  // Get revenue accounts grouped by subType
  const revenueAccounts = dbAll(`
    SELECT a.id, a.accountName, a.accountSubType as subType,
      SUM(gl.credit - gl.debit) as amount
    FROM general_ledger gl
    JOIN accounts a ON gl.accountId = a.id
    WHERE gl.organizationId = ? AND a.accountType = 'revenue' AND gl.del_flag = 0${dateFilter}
    GROUP BY a.id, a.accountName, a.accountSubType
    HAVING amount != 0
    ORDER BY a.accountSubType, a.accountName
  `, params);

  // Get expense accounts grouped by subType
  const expenseAccounts = dbAll(`
    SELECT a.id, a.accountName, a.accountSubType as subType,
      SUM(gl.debit - gl.credit) as amount
    FROM general_ledger gl
    JOIN accounts a ON gl.accountId = a.id
    WHERE gl.organizationId = ? AND a.accountType = 'expense' AND gl.del_flag = 0${dateFilter}
    GROUP BY a.id, a.accountName, a.accountSubType
    HAVING amount != 0
    ORDER BY a.accountSubType, a.accountName
  `, params);

  // Group into subType groups
  const groupBySubType = (accounts: any[]) => {
    const map = new Map<string, { subType: string; accounts: any[]; subtotal: number }>();
    for (const acc of accounts) {
      const st = acc.subType || 'General';
      if (!map.has(st)) map.set(st, { subType: st, accounts: [], subtotal: 0 });
      const group = map.get(st)!;
      group.accounts.push({ id: acc.id, name: acc.name, amount: acc.amount });
      group.subtotal += acc.amount;
    }
    return Array.from(map.values());
  };

  const revenueGroups = groupBySubType(revenueAccounts);
  const expenseGroups = groupBySubType(expenseAccounts);
  const totalRevenue = revenueGroups.reduce((s, g) => s + g.subtotal, 0);
  const totalExpenses = expenseGroups.reduce((s, g) => s + g.subtotal, 0);
  const netIncome = totalRevenue - totalExpenses;

  // Resolve dates
  const resolvedStart = (startDate as string) || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const resolvedEnd = (endDate as string) || new Date().toISOString().slice(0, 10);

  res.json({
    revenueGroups,
    expenseGroups,
    totalRevenue,
    totalExpenses,
    netIncome,
    startDate: resolvedStart,
    endDate: resolvedEnd,
  });
});

// ─── Balance Sheet ───────────────────────────────────────────────────────────
reportsRouter.get('/balance-sheet', (req: AuthenticatedRequest, res: Response) => {
  const { asOfDate } = req.query;
  const orgId = req.organizationId;
  const dateFilter = asOfDate ? ' AND gl.transactionDate <= ?' : '';
  const params: any[] = asOfDate ? [orgId, asOfDate] : [orgId];

  const getGroups = (type: string) => {
    const accounts = dbAll(`
      SELECT a.id, a.accountName, a.accountSubType as subType,
        SUM(CASE WHEN '${type}' IN ('asset','expense') THEN gl.debit - gl.credit ELSE gl.credit - gl.debit END) as amount
      FROM general_ledger gl
      JOIN accounts a ON gl.accountId = a.id
      WHERE gl.organizationId = ? AND a.accountType = '${type}' AND gl.del_flag = 0${dateFilter}
      GROUP BY a.id, a.accountName, a.accountSubType
      HAVING amount != 0
      ORDER BY a.accountSubType, a.accountName
    `, params);

    const map = new Map<string, { subType: string; accounts: any[]; subtotal: number }>();
    for (const acc of accounts) {
      const st = acc.subType || 'General';
      if (!map.has(st)) map.set(st, { subType: st, accounts: [], subtotal: 0 });
      const group = map.get(st)!;
      group.accounts.push({ id: acc.id, name: acc.name, amount: acc.amount });
      group.subtotal += acc.amount;
    }
    return Array.from(map.values());
  };

  const assetGroups = getGroups('asset');
  const liabilityGroups = getGroups('liability');
  const equityGroups = getGroups('equity');

  const totalAssets = assetGroups.reduce((s, g) => s + g.subtotal, 0);
  const totalLiabilities = liabilityGroups.reduce((s, g) => s + g.subtotal, 0);
  const totalEquity = equityGroups.reduce((s, g) => s + g.subtotal, 0);

  // Retained earnings = Revenue - Expenses (for the period)
  const retainedEarnings = (() => {
    const rev = dbGet(`SELECT SUM(gl.credit - gl.debit) as total FROM general_ledger gl JOIN accounts a ON gl.accountId = a.id WHERE gl.organizationId = ? AND a.accountType = 'revenue' AND gl.del_flag = 0${dateFilter}`, params);
    const exp = dbGet(`SELECT SUM(gl.debit - gl.credit) as total FROM general_ledger gl JOIN accounts a ON gl.accountId = a.id WHERE gl.organizationId = ? AND a.accountType = 'expense' AND gl.del_flag = 0${dateFilter}`, params);
    return (rev?.total || 0) - (exp?.total || 0);
  })();

  res.json({
    assetGroups,
    liabilityGroups,
    equityGroups,
    totalAssets,
    totalLiabilities,
    totalEquity,
    retainedEarnings,
    totalLiabilitiesAndEquity: totalLiabilities + totalEquity + retainedEarnings,
    asOfDate: (asOfDate as string) || new Date().toISOString().slice(0, 10),
  });
});

// ─── Trial Balance ───────────────────────────────────────────────────────────
reportsRouter.get('/trial-balance', (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate } = req.query;
  const orgId = req.organizationId;
  const params: any[] = [orgId];
  let dateFilter = '';
  if (startDate) { dateFilter += ' AND gl.transactionDate >= ?'; params.push(startDate); }
  if (endDate) { dateFilter += ' AND gl.transactionDate <= ?'; params.push(endDate); }

  const accounts = dbAll(`
    SELECT a.id, a.accountName, a.accountCode as code, a.accountType as type, a.accountSubType as subType,
      SUM(gl.debit) as totalDebit,
      SUM(gl.credit) as totalCredit
    FROM general_ledger gl
    JOIN accounts a ON gl.accountId = a.id
    WHERE gl.organizationId = ? AND gl.del_flag = 0${dateFilter}
    GROUP BY a.id, a.accountName, a.accountCode, a.accountType, a.accountSubType
    HAVING totalDebit != 0 OR totalCredit != 0
    ORDER BY a.accountCode, a.accountName
  `, params);

  const totalDebit = accounts.reduce((s: number, a: any) => s + (a.totalDebit || 0), 0);
  const totalCredit = accounts.reduce((s: number, a: any) => s + (a.totalCredit || 0), 0);

  res.json({
    accounts,
    totalDebit,
    totalCredit,
    isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    startDate: (startDate as string) || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
    endDate: (endDate as string) || new Date().toISOString().slice(0, 10),
  });
});

// ─── Cash Flow Statement ─────────────────────────────────────────────────────
reportsRouter.get('/cash-flow', (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate } = req.query;
  const orgId = req.organizationId;
  const params: any[] = [orgId];
  let dateFilter = '';
  if (startDate) { dateFilter += ' AND gl.transactionDate >= ?'; params.push(startDate); }
  if (endDate) { dateFilter += ' AND gl.transactionDate <= ?'; params.push(endDate); }

  // Operating: Revenue - Expenses (by subType)
  const operatingRevenue = dbGet(`SELECT SUM(gl.credit - gl.debit) as total FROM general_ledger gl JOIN accounts a ON gl.accountId = a.id WHERE gl.organizationId = ? AND a.accountType = 'revenue' AND gl.del_flag = 0${dateFilter}`, params);
  const operatingExpenses = dbGet(`SELECT SUM(gl.debit - gl.credit) as total FROM general_ledger gl JOIN accounts a ON gl.accountId = a.id WHERE gl.organizationId = ? AND a.accountType = 'expense' AND gl.del_flag = 0${dateFilter}`, params);

  // AR/AP changes (simplified)
  const arChange = dbGet(`SELECT SUM(gl.debit - gl.credit) as total FROM general_ledger gl JOIN accounts a ON gl.accountId = a.id WHERE gl.organizationId = ? AND a.accountSubType = 'accounts_receivable' AND gl.del_flag = 0${dateFilter}`, params);
  const apChange = dbGet(`SELECT SUM(gl.credit - gl.debit) as total FROM general_ledger gl JOIN accounts a ON gl.accountId = a.id WHERE gl.organizationId = ? AND a.accountSubType = 'accounts_payable' AND gl.del_flag = 0${dateFilter}`, params);

  // Investing: Fixed assets purchased
  const investing = dbGet(`SELECT SUM(gl.debit - gl.credit) as total FROM general_ledger gl JOIN accounts a ON gl.accountId = a.id WHERE gl.organizationId = ? AND a.accountSubType IN ('fixed_asset','property_plant_equipment') AND gl.del_flag = 0${dateFilter}`, params);

  // Financing: Loan movements
  const financing = dbGet(`SELECT SUM(gl.credit - gl.debit) as total FROM general_ledger gl JOIN accounts a ON gl.accountId = a.id WHERE gl.organizationId = ? AND a.accountSubType IN ('long_term_liability','loan','notes_payable') AND gl.del_flag = 0${dateFilter}`, params);

  const netOperating = (operatingRevenue?.total || 0) - (operatingExpenses?.total || 0) - (arChange?.total || 0) + (apChange?.total || 0);
  const netInvesting = -(investing?.total || 0);
  const netFinancing = financing?.total || 0;
  const netCashChange = netOperating + netInvesting + netFinancing;

  res.json({
    operating: {
      revenue: operatingRevenue?.total || 0,
      expenses: operatingExpenses?.total || 0,
      arChange: -(arChange?.total || 0),
      apChange: apChange?.total || 0,
      netOperating,
    },
    investing: { assetPurchases: investing?.total || 0, netInvesting },
    financing: { loanProceeds: financing?.total || 0, netFinancing },
    netCashChange,
    startDate: (startDate as string) || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
    endDate: (endDate as string) || new Date().toISOString().slice(0, 10),
  });
});

// ─── Aged Receivables ────────────────────────────────────────────────────────
reportsRouter.get('/aged-receivables', (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId;
  const invoices = dbAll(`
    SELECT i.*, c.name as customerName
    FROM invoices i
    LEFT JOIN customers c ON i.customerId = c.id
    WHERE i.organizationId = ? AND i.del_flag = 0
      AND i.status IN ('sent','overdue')
      AND i.paidAmount < i.totalAmount
    ORDER BY i.dueDate ASC
  `, [orgId]);

  const now = new Date();
  const buckets = { current: [] as any[], days30: [] as any[], days60: [] as any[], days90: [] as any[], over90: [] as any[] };
  let totals = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 };

  for (const inv of invoices) {
    const due = new Date(inv.dueDate);
    const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    const outstanding = (inv.totalAmount || 0) - (inv.paidAmount || 0);
    const entry = { id: inv.id, customerName: inv.customerName || 'Unknown', invoiceNumber: inv.invoiceNumber, dueDate: inv.dueDate, totalAmount: inv.totalAmount, outstanding, daysOverdue };

    if (daysOverdue <= 0) { buckets.current.push(entry); totals.current += outstanding; }
    else if (daysOverdue <= 30) { buckets.days30.push(entry); totals.days30 += outstanding; }
    else if (daysOverdue <= 60) { buckets.days60.push(entry); totals.days60 += outstanding; }
    else if (daysOverdue <= 90) { buckets.days90.push(entry); totals.days90 += outstanding; }
    else { buckets.over90.push(entry); totals.over90 += outstanding; }
  }

  totals.total = totals.current + totals.days30 + totals.days60 + totals.days90 + totals.over90;
  res.json({ buckets, totals });
});

// ─── Aged Payables ───────────────────────────────────────────────────────────
reportsRouter.get('/aged-payables', (req: AuthenticatedRequest, res: Response) => {
  const orgId = req.organizationId;
  const bills = dbAll(`
    SELECT b.*, v.name as vendorName
    FROM bills b
    LEFT JOIN vendors v ON b.vendorId = v.id
    WHERE b.organizationId = ? AND b.del_flag = 0
      AND b.status NOT IN ('paid','cancelled')
      AND b.paidAmount < b.totalAmount
    ORDER BY b.dueDate ASC
  `, [orgId]);

  const now = new Date();
  const buckets = { current: [] as any[], days30: [] as any[], days60: [] as any[], days90: [] as any[], over90: [] as any[] };
  let totals = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0, total: 0 };

  for (const bill of bills) {
    const due = new Date(bill.dueDate);
    const daysOverdue = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    const outstanding = (bill.totalAmount || 0) - (bill.paidAmount || 0);
    const entry = { id: bill.id, vendorName: bill.vendorName || 'Unknown', billNumber: bill.billNumber, dueDate: bill.dueDate, totalAmount: bill.totalAmount, outstanding, daysOverdue };

    if (daysOverdue <= 0) { buckets.current.push(entry); totals.current += outstanding; }
    else if (daysOverdue <= 30) { buckets.days30.push(entry); totals.days30 += outstanding; }
    else if (daysOverdue <= 60) { buckets.days60.push(entry); totals.days60 += outstanding; }
    else if (daysOverdue <= 90) { buckets.days90.push(entry); totals.days90 += outstanding; }
    else { buckets.over90.push(entry); totals.over90 += outstanding; }
  }

  totals.total = totals.current + totals.days30 + totals.days60 + totals.days90 + totals.over90;
  res.json({ buckets, totals });
});

// ─── Tax Summary ─────────────────────────────────────────────────────────────
reportsRouter.get('/tax-summary', (req: AuthenticatedRequest, res: Response) => {
  const { startDate, endDate } = req.query;
  const orgId = req.organizationId;
  const params: any[] = [orgId];
  let invoiceDateFilter = '';
  let expDateFilter = '';
  if (startDate) { invoiceDateFilter += ' AND invoiceDate >= ?'; expDateFilter += ' AND date >= ?'; params.push(startDate); }
  if (endDate) { invoiceDateFilter += ' AND invoiceDate <= ?'; expDateFilter += ' AND date <= ?'; params.push(endDate); }

  const salesTax = dbGet(`SELECT SUM(taxAmount) as total FROM invoices WHERE organizationId = ? AND del_flag = 0 AND status != 'cancelled'${invoiceDateFilter}`, params.slice(0, 1 + (startDate ? 1 : 0) + (endDate ? 1 : 0)));

  const expParams: any[] = [orgId];
  if (startDate) expParams.push(startDate);
  if (endDate) expParams.push(endDate);
  const purchaseTax = dbGet(`SELECT SUM(taxAmount) as total FROM expenses WHERE organizationId = ? AND del_flag = 0${expDateFilter}`, expParams);

  const outputTax = salesTax?.total || 0;
  const inputTax = purchaseTax?.total || 0;

  res.json({
    outputTax,
    inputTax,
    netTax: outputTax - inputTax,
    startDate: (startDate as string) || new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
    endDate: (endDate as string) || new Date().toISOString().slice(0, 10),
  });
});
