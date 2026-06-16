/**
 * Year-End Close API
 * Returns a smart checklist that auto-checks against real data.
 */

import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const yearEndCloseRouter = Router();

const invoiceRepo = new Repository<any>('invoices');
const billRepo = new Repository<any>('bills');
const expenseRepo = new Repository<any>('expenses');
const jeRepo = new Repository<any>('journal_entries');
const bankAccountRepo = new Repository<any>('bank_accounts');
const glRepo = new Repository<any>('general_ledger');
const accountRepo = new Repository<any>('accounts');

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'complete' | 'warning' | 'incomplete';
  detail?: string;
  actionUrl?: string;
}

/**
 * GET /api/year-end-close?year=2026
 */
yearEndCloseRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const fiscalYear = parseInt(req.query.year as string) || new Date().getFullYear();
    const orgId = req.organizationId!;
    const yearStart = `${fiscalYear}-01-01`;
    const yearEnd = `${fiscalYear}-12-31`;

    const items: ChecklistItem[] = [];

    // 1. Bank Reconciliation
    const bankAccounts = bankAccountRepo.find({
      where: { organizationId: orgId, del_flag: 0, isActive: 1 },
    });
    const glEntries = glRepo.find({ where: { organizationId: orgId, del_flag: 0 } });
    const reconciledCount = glEntries.filter((gl: any) => gl.isReconciled === 1).length;
    const unreconciledCount = glEntries.filter((gl: any) => gl.isReconciled === 0).length;

    items.push({
      id: 'bank_reconciliation',
      title: 'Reconcile All Bank Accounts',
      description: 'Ensure all bank accounts are reconciled through year-end',
      category: 'reconciliation',
      status: bankAccounts.length === 0 ? 'incomplete' : unreconciledCount === 0 ? 'complete' : 'warning',
      detail: bankAccounts.length === 0 ? 'No bank accounts' : `${reconciledCount} reconciled, ${unreconciledCount} unreconciled`,
      actionUrl: '/banking',
    });

    // 2. Outstanding Invoices
    const outstandingInvoices = invoiceRepo.find({
      where: { organizationId: orgId, del_flag: 0 },
    }).filter((inv: any) => {
      const d = inv.invoiceDate || '';
      return d >= yearStart && d <= yearEnd && ['sent', 'overdue'].includes(inv.status);
    }).length;

    items.push({
      id: 'outstanding_invoices',
      title: 'Review Outstanding Invoices',
      description: 'Follow up on unpaid invoices or write off bad debts',
      category: 'receivables',
      status: outstandingInvoices === 0 ? 'complete' : 'warning',
      detail: `${outstandingInvoices} outstanding invoice(s)`,
      actionUrl: '/invoices',
    });

    // 3. Outstanding Bills
    const outstandingBills = billRepo.find({
      where: { organizationId: orgId, del_flag: 0 },
    }).filter((bill: any) => {
      const d = bill.billDate || '';
      return d >= yearStart && d <= yearEnd && ['draft', 'open', 'overdue'].includes(bill.status);
    }).length;

    items.push({
      id: 'outstanding_bills',
      title: 'Review Outstanding Bills',
      description: 'Ensure all vendor bills are accounted for and paid',
      category: 'payables',
      status: outstandingBills === 0 ? 'complete' : 'warning',
      detail: `${outstandingBills} outstanding bill(s)`,
      actionUrl: '/bills',
    });

    // 4. Pending Expenses
    const pendingExpenses = expenseRepo.find({
      where: { organizationId: orgId, del_flag: 0, status: 'pending' },
    }).filter((exp: any) => {
      const d = exp.date || '';
      return d >= yearStart && d <= yearEnd;
    }).length;

    items.push({
      id: 'pending_expenses',
      title: 'Approve Pending Expenses',
      description: 'Process all pending expense approvals',
      category: 'payables',
      status: pendingExpenses === 0 ? 'complete' : 'warning',
      detail: `${pendingExpenses} pending expense(s)`,
      actionUrl: '/expenses',
    });

    // 5. Draft Journal Entries
    const draftEntries = jeRepo.find({
      where: { organizationId: orgId, del_flag: 0, status: 'draft' },
    }).filter((je: any) => {
      const d = je.entryDate || '';
      return d >= yearStart && d <= yearEnd;
    }).length;

    items.push({
      id: 'draft_entries',
      title: 'Post All Draft Journal Entries',
      description: 'Review and post any remaining draft entries for the year',
      category: 'accounting',
      status: draftEntries === 0 ? 'complete' : 'warning',
      detail: `${draftEntries} draft entry(ies)`,
      actionUrl: '/journal-entries',
    });

    // 6. Period Close check
    const closingEntries = jeRepo.find({
      where: { organizationId: orgId, del_flag: 0, status: 'posted' },
    }).filter((je: any) => je.description?.startsWith('Period Close:'));

    const closedMonthsThisYear = closingEntries.filter((je: any) => {
      const yearMatch = je.description?.includes(String(fiscalYear));
      return yearMatch;
    }).length;

    const currentMonth = fiscalYear === new Date().getFullYear() ? new Date().getMonth() + 1 : 12;
    const monthsToClose = currentMonth - closedMonthsThisYear;

    items.push({
      id: 'period_close',
      title: 'Close All Accounting Periods',
      description: 'Lock completed months to prevent accidental changes',
      category: 'accounting',
      status: monthsToClose <= 0 ? 'complete' : 'warning',
      detail: monthsToClose <= 0 ? 'All periods closed' : `${monthsToClose} month(s) still open`,
      actionUrl: '/period-close',
    });

    // 7. Depreciation
    items.push({
      id: 'depreciation',
      title: 'Run Year-End Depreciation',
      description: 'Calculate and post depreciation for all fixed assets',
      category: 'accounting',
      status: 'incomplete',
      detail: 'Manual check required',
      actionUrl: '/assets',
    });

    // 8. Trial Balance
    const accounts = accountRepo.find({ where: { organizationId: orgId, del_flag: 0, isActive: 1 } });
    const totalDebits = accounts.reduce((s: number, a: any) => s + (a.debitBalance || 0), 0);
    const totalCredits = accounts.reduce((s: number, a: any) => s + (a.creditBalance || 0), 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    items.push({
      id: 'trial_balance',
      title: 'Review Trial Balance',
      description: 'Verify debits equal credits across all accounts',
      category: 'reports',
      status: isBalanced && totalDebits > 0 ? 'complete' : totalDebits > 0 ? 'warning' : 'incomplete',
      detail: isBalanced ? 'Balanced' : totalDebits > 0 ? `Difference: GHS ${Math.abs(totalDebits - totalCredits).toFixed(2)}` : 'No transactions yet',
      actionUrl: '/reports',
    });

    // 9. Financial Statements
    items.push({
      id: 'financial_statements',
      title: 'Generate Financial Statements',
      description: 'Review Income Statement, Balance Sheet for the year',
      category: 'reports',
      status: 'incomplete',
      detail: 'Review and archive',
      actionUrl: '/reports',
    });

    // 10. Backup
    items.push({
      id: 'data_backup',
      title: 'Export Data Backup',
      description: 'Download a full data export for your records',
      category: 'reports',
      status: 'incomplete',
      detail: 'Recommended before year-end',
      actionUrl: '/settings',
    });

    const complete = items.filter((i) => i.status === 'complete').length;
    const total = items.length;

    res.json({
      fiscalYear,
      items,
      summary: {
        complete,
        total,
        percentage: total > 0 ? Math.round((complete / total) * 100) : 0,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
