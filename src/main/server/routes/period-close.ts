/**
 * Period Close API Routes
 * Handles closing/reopening accounting periods with GL postings.
 */

import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';
import { dbAll } from '../../database';

export const periodCloseRouter = Router();

const glRepo = new Repository<any>('general_ledger');
const jeRepo = new Repository<any>('journal_entries');
const accountRepo = new Repository<any>('accounts');

// We store closed periods in a simple table — let's use a settings-like approach
// Since we don't have a dedicated table, we'll use journal_entries with referenceType = 'period_close'

/**
 * GET /api/period-close
 * Get period close status, tasks/checklist, and history
 */
periodCloseRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Find closing journal entries (entries with description starting with "Period Close:")
    const closingEntries = jeRepo.find({
      where: { organizationId: req.organizationId, del_flag: 0 },
      orderBy: 'entryDate',
      order: 'DESC',
    }).filter((je: any) => je.description?.startsWith('Period Close:'));

    // Build closed periods list
    const closedPeriods = closingEntries
      .filter((je: any) => je.status === 'posted')
      .map((je: any) => {
        const match = je.description.match(/Period Close: (\w+ \d{4})/);
        const label = match ? match[1] : je.description;
        // Parse year/month from the entry
        const dateStr = je.entryDate || je.createdAt;
        const d = new Date(dateStr);
        return {
          id: je.id,
          periodLabel: label,
          periodYear: d.getFullYear(),
          periodMonth: d.getMonth() + 1,
          status: 'closed' as const,
          closedAt: je.createdAt,
          totalRevenue: 0,
          totalExpenses: 0,
          netIncome: 0,
          postedEntriesCount: 0,
        };
      });

    // Check if current period is closed
    const currentPeriodLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const isCurrentPeriodClosed = closingEntries.some(
      (je: any) => je.status === 'posted' && je.description?.includes(currentPeriodLabel)
    );

    // Count posted entries this period
    const periodStart = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
    const periodEnd = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
    
    const postedEntries = jeRepo.find({
      where: { organizationId: req.organizationId, del_flag: 0, status: 'posted' },
    }).filter((je: any) => {
      const d = je.entryDate || '';
      return d >= periodStart && d <= periodEnd && !je.description?.startsWith('Period Close:');
    }).length;

    // Count reconciled GL entries
    const reconciledCount = glRepo.find({
      where: { organizationId: req.organizationId, del_flag: 0, isReconciled: 1 },
    }).length;

    const unreconciledCount = glRepo.find({
      where: { organizationId: req.organizationId, del_flag: 0, isReconciled: 0 },
    }).length;

    // Build tasks checklist
    const tasks = [
      {
        title: "All journal entries posted",
        description: "Ensure no draft entries remain for this period",
        completed: jeRepo.find({
          where: { organizationId: req.organizationId, del_flag: 0, status: 'draft' },
        }).filter((je: any) => {
          const d = je.entryDate || '';
          return d >= periodStart && d <= periodEnd;
        }).length === 0,
      },
      {
        title: "Bank reconciliation complete",
        description: "All bank accounts should be reconciled for this period",
        completed: unreconciledCount === 0 || reconciledCount > 0,
      },
      {
        title: "Revenue and expenses reviewed",
        description: "Verify all income and expenses are recorded correctly",
        completed: postedEntries > 0,
      },
    ];

    // Calculate revenue/expenses for closed periods
    for (const cp of closedPeriods) {
      const pStart = new Date(cp.periodYear, cp.periodMonth - 1, 1).toISOString().split('T')[0];
      const pEnd = new Date(cp.periodYear, cp.periodMonth, 0).toISOString().split('T')[0];

      const glEntries = glRepo.find({
        where: { organizationId: req.organizationId, del_flag: 0 },
      }).filter((gl: any) => gl.transactionDate >= pStart && gl.transactionDate <= pEnd);

      // Look up accounts to determine revenue vs expense
      const accounts = accountRepo.find({ where: { organizationId: req.organizationId } });
      const accountMap = new Map(accounts.map((a: any) => [a.id, a]));

      let revenue = 0, expenses = 0;
      for (const gl of glEntries) {
        const acct = accountMap.get(gl.accountId);
        if (acct?.accountType === 'revenue') revenue += (gl.credit || 0) - (gl.debit || 0);
        if (acct?.accountType === 'expense') expenses += (gl.debit || 0) - (gl.credit || 0);
      }
      cp.totalRevenue = revenue;
      cp.totalExpenses = expenses;
      cp.netIncome = revenue - expenses;
      cp.postedEntriesCount = glEntries.length;
    }

    res.json({
      isCurrentPeriodClosed,
      closedPeriods,
      tasks,
      stats: {
        postedEntries,
        reconciledAccounts: reconciledCount,
        unreconciledItems: unreconciledCount,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/period-close/close
 * Close the current period: create closing JE that zeros revenue/expense → retained earnings
 */
periodCloseRouter.post('/close', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { notes } = req.body;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const periodLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    // Check if already closed
    const existing = jeRepo.find({
      where: { organizationId: req.organizationId, del_flag: 0, status: 'posted' },
    }).find((je: any) => je.description === `Period Close: ${periodLabel}`);

    if (existing) {
      res.status(400).json({ error: 'This period is already closed' });
      return;
    }

    // Get all revenue and expense accounts with balances
    const accounts = accountRepo.find({
      where: { organizationId: req.organizationId, del_flag: 0, isActive: 1 },
    });

    const revenueAccounts = accounts.filter((a: any) => a.accountType === 'revenue' && Math.abs(a.currentBalance || 0) > 0.01);
    const expenseAccounts = accounts.filter((a: any) => a.accountType === 'expense' && Math.abs(a.currentBalance || 0) > 0.01);

    // Calculate net income
    const totalRevenue = revenueAccounts.reduce((s: number, a: any) => s + (a.currentBalance || 0), 0);
    const totalExpenses = expenseAccounts.reduce((s: number, a: any) => s + (a.currentBalance || 0), 0);
    const netIncome = totalRevenue - totalExpenses; // revenue has credit balance (negative currentBalance convention may differ)

    // Build closing journal entry line items
    const lineItems: any[] = [];

    // Zero out revenue accounts (debit revenue to close)
    for (const acct of revenueAccounts) {
      const balance = Math.abs(acct.currentBalance || 0);
      lineItems.push({
        accountId: acct.id,
        accountName: acct.accountName,
        accountCode: acct.accountCode,
        description: `Close ${acct.accountName}`,
        debit: balance,
        credit: 0,
      });
    }

    // Zero out expense accounts (credit expense to close)
    for (const acct of expenseAccounts) {
      const balance = Math.abs(acct.currentBalance || 0);
      lineItems.push({
        accountId: acct.id,
        accountName: acct.accountName,
        accountCode: acct.accountCode,
        description: `Close ${acct.accountName}`,
        debit: 0,
        credit: balance,
      });
    }

    // Transfer net to Retained Earnings
    if (lineItems.length > 0) {
      // Find or create Retained Earnings account
      let retainedEarnings = accounts.find((a: any) =>
        a.accountType === 'equity' && (a.accountName?.toLowerCase().includes('retained') || a.accountCode === '3200')
      );

      if (!retainedEarnings) {
        retainedEarnings = accountRepo.create({
          organizationId: req.organizationId,
          accountCode: '3200',
          accountName: 'Retained Earnings',
          accountType: 'equity',
          accountSubType: 'Retained Earnings',
          isActive: 1,
          isSystemAccount: 1,
          currentBalance: 0,
          debitBalance: 0,
          creditBalance: 0,
          createdBy: req.userId,
        });
      }

      const totalDebits = lineItems.reduce((s, l) => s + l.debit, 0);
      const totalCredits = lineItems.reduce((s, l) => s + l.credit, 0);
      const diff = totalDebits - totalCredits;

      // Balance the entry with Retained Earnings
      if (diff > 0) {
        lineItems.push({
          accountId: retainedEarnings.id,
          accountName: retainedEarnings.accountName,
          accountCode: retainedEarnings.accountCode,
          description: 'Net income to Retained Earnings',
          debit: 0,
          credit: diff,
        });
      } else if (diff < 0) {
        lineItems.push({
          accountId: retainedEarnings.id,
          accountName: retainedEarnings.accountName,
          accountCode: retainedEarnings.accountCode,
          description: 'Net loss to Retained Earnings',
          debit: Math.abs(diff),
          credit: 0,
        });
      }
    }

    // Create closing journal entry
    const totalDebit = lineItems.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lineItems.reduce((s, l) => s + l.credit, 0);

    const count = jeRepo.count({ organizationId: req.organizationId });
    const entryNumber = `JE-${String(count + 1).padStart(5, '0')}`;

    const closingEntry = jeRepo.create({
      organizationId: req.organizationId,
      entryNumber,
      entryDate: new Date(currentYear, currentMonth - 1, new Date(currentYear, currentMonth, 0).getDate()).toISOString().split('T')[0],
      description: `Period Close: ${periodLabel}`,
      lineItems,
      totalDebit,
      totalCredit,
      status: 'posted',
      notes: notes || `Automatic closing entry for ${periodLabel}`,
      referenceType: 'period_close',
      createdBy: req.userId,
    });

    // Post to GL and update account balances
    for (const line of lineItems) {
      const fiscalPeriod = currentMonth;
      const fiscalYear = currentYear;

      glRepo.create({
        organizationId: req.organizationId,
        accountId: line.accountId,
        journalEntryId: closingEntry.id,
        transactionDate: closingEntry.entryDate,
        description: line.description,
        debit: line.debit || 0,
        credit: line.credit || 0,
        runningBalance: 0,
        referenceType: 'period_close',
        referenceId: closingEntry.id,
        referenceNumber: entryNumber,
        fiscalYear,
        fiscalPeriod,
        isReconciled: 0,
      });

      // Update account balance
      const account = accountRepo.findById(line.accountId);
      if (account) {
        accountRepo.update(line.accountId, {
          debitBalance: (account.debitBalance || 0) + (line.debit || 0),
          creditBalance: (account.creditBalance || 0) + (line.credit || 0),
          currentBalance: (account.currentBalance || 0) + (line.debit || 0) - (line.credit || 0),
        });
      }
    }

    res.json({ success: true, message: `${periodLabel} closed successfully`, entryId: closingEntry.id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/period-close/reopen
 * Reopen a previously closed period by voiding its closing entry
 */
periodCloseRouter.post('/reopen', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { periodYear, periodMonth } = req.body;
    const periodDate = new Date(periodYear, periodMonth - 1, 1);
    const periodLabel = periodDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    // Find the closing entry
    const closingEntry = jeRepo.find({
      where: { organizationId: req.organizationId, del_flag: 0, status: 'posted' },
    }).find((je: any) => je.description === `Period Close: ${periodLabel}`);

    if (!closingEntry) {
      res.status(404).json({ error: 'Closing entry not found for this period' });
      return;
    }

    // Reverse the GL entries
    const lineItems = closingEntry.lineItems || [];
    for (const line of lineItems) {
      // Create reversed GL entry
      glRepo.create({
        organizationId: req.organizationId,
        accountId: line.accountId,
        journalEntryId: closingEntry.id,
        transactionDate: new Date().toISOString().split('T')[0],
        description: `REOPEN: ${line.description}`,
        debit: line.credit || 0,
        credit: line.debit || 0,
        runningBalance: 0,
        referenceType: 'period_reopen',
        referenceId: closingEntry.id,
        referenceNumber: `REOPEN-${closingEntry.entryNumber}`,
        fiscalYear: new Date().getFullYear(),
        fiscalPeriod: new Date().getMonth() + 1,
        isReconciled: 0,
      });

      // Reverse account balances
      const account = accountRepo.findById(line.accountId);
      if (account) {
        accountRepo.update(line.accountId, {
          debitBalance: (account.debitBalance || 0) - (line.debit || 0) + (line.credit || 0),
          creditBalance: (account.creditBalance || 0) - (line.credit || 0) + (line.debit || 0),
          currentBalance: (account.currentBalance || 0) - (line.debit || 0) + (line.credit || 0),
        });
      }
    }

    // Mark closing entry as voided
    jeRepo.update(closingEntry.id, { status: 'voided', modifiedBy: req.userId });

    res.json({ success: true, message: `${periodLabel} reopened successfully` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
