import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const journalEntriesRouter = Router();
const repo = new Repository<any>('journal_entries');
const glRepo = new Repository<any>('general_ledger');
const accountRepo = new Repository<any>('accounts');

journalEntriesRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '20', status } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (status && status !== 'all') where.status = status;
  res.json(repo.findPaginated({ where, orderBy: 'entryDate', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) }));
});

journalEntriesRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = repo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) { res.status(404).json({ error: 'Journal entry not found' }); return; }
  
  // Enrich line items with account names
  if (item.lineItems && Array.isArray(item.lineItems)) {
    item.lineItems = item.lineItems.map((line: any) => {
      if (line.accountId && !line.accountName) {
        const account = accountRepo.findById(line.accountId);
        if (account) {
          return { ...line, accountName: account.accountName, accountCode: account.accountCode };
        }
      }
      return line;
    });
  }
  
  res.json(item);
});

journalEntriesRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = req.body;
    const count = repo.count({ organizationId: req.organizationId });
    const entryNumber = data.entryNumber || `JE-${String(count + 1).padStart(5, '0')}`;

    // Enrich line items with account names for display
    const lineItems = (data.lineItems || []).map((line: any) => {
      if (line.accountId && !line.accountName) {
        const account = accountRepo.findById(line.accountId);
        if (account) {
          return { ...line, accountName: account.accountName, accountCode: account.accountCode };
        }
      }
      return line;
    });

    const totalDebit = lineItems.reduce((s: number, i: any) => s + (i.debit || 0), 0);
    const totalCredit = lineItems.reduce((s: number, i: any) => s + (i.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      res.status(400).json({ error: 'Debits must equal credits' });
      return;
    }

    const entry = repo.create({
      ...data, organizationId: req.organizationId, entryNumber,
      totalDebit, totalCredit, lineItems, createdBy: req.userId,
    });

    // If posting, create GL entries and update account balances
    if (data.status === 'posted') {
      postToGeneralLedger(entry, req.organizationId!);
    }

    res.status(201).json({ success: true, data: entry });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

journalEntriesRouter.post('/:id/post', (req: AuthenticatedRequest, res: Response) => {
  const entry = repo.findById(req.params.id);
  if (!entry || entry.organizationId !== req.organizationId) { res.status(404).json({ error: 'Journal entry not found' }); return; }
  if (entry.status === 'posted') { res.status(400).json({ error: 'Already posted' }); return; }

  repo.update(req.params.id, { status: 'posted', modifiedBy: req.userId });
  postToGeneralLedger(entry, req.organizationId!);
  res.json({ success: true, message: 'Journal entry posted' });
});

journalEntriesRouter.post('/:id/void', (req: AuthenticatedRequest, res: Response) => {
  try {
    const entry = repo.findById(req.params.id);
    if (!entry || entry.organizationId !== req.organizationId) { res.status(404).json({ error: 'Journal entry not found' }); return; }
    if (entry.status === 'voided') { res.status(400).json({ error: 'Already voided' }); return; }
    if (entry.status === 'draft') { res.status(400).json({ error: 'Cannot void a draft — just delete it' }); return; }

    // Reverse the GL entries — create opposing entries
    const lineItems = entry.lineItems || [];
    const entryDate = new Date().toISOString().split('T')[0];
    const fiscalYear = new Date().getFullYear();
    const fiscalPeriod = new Date().getMonth() + 1;

    for (const line of lineItems) {
      // Create reversed GL entry (swap debit/credit)
      glRepo.create({
        organizationId: req.organizationId,
        accountId: line.accountId,
        journalEntryId: entry.id,
        transactionDate: entryDate,
        description: `VOID: ${line.description || entry.description}`,
        debit: line.credit || 0,
        credit: line.debit || 0,
        runningBalance: 0,
        referenceType: 'journal_entry_void',
        referenceId: entry.id,
        referenceNumber: `VOID-${entry.entryNumber}`,
        fiscalYear,
        fiscalPeriod,
        isReconciled: false,
      });

      // Reverse account balances
      const account = accountRepo.findById(line.accountId);
      if (account) {
        const debit = line.debit || 0;
        const credit = line.credit || 0;
        accountRepo.update(line.accountId, {
          debitBalance: (account.debitBalance || 0) - debit + credit,
          creditBalance: (account.creditBalance || 0) - credit + debit,
          currentBalance: (account.currentBalance || 0) - debit + credit,
        });
      }
    }

    // Mark entry as voided
    repo.update(req.params.id, { status: 'voided', modifiedBy: req.userId });

    res.json({ success: true, message: 'Journal entry voided and GL reversed' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

journalEntriesRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = repo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Journal entry not found' }); return; }
  repo.softDelete(req.params.id, req.userId);
  res.json({ success: true, message: 'Journal entry deleted' });
});

function postToGeneralLedger(entry: any, organizationId: string) {
  const lineItems = entry.lineItems || [];
  const entryDate = new Date(entry.entryDate);
  const fiscalYear = entryDate.getFullYear();
  const fiscalPeriod = entryDate.getMonth() + 1;

  for (const line of lineItems) {
    glRepo.create({
      organizationId,
      accountId: line.accountId,
      journalEntryId: entry.id,
      transactionDate: entry.entryDate,
      description: line.description || entry.description,
      debit: line.debit || 0,
      credit: line.credit || 0,
      runningBalance: 0,
      referenceType: 'journal_entry',
      referenceId: entry.id,
      referenceNumber: entry.entryNumber,
      fiscalYear,
      fiscalPeriod,
      isReconciled: false,
    });

    // Update account balance
    const account = accountRepo.findById(line.accountId);
    if (account) {
      const debit = line.debit || 0;
      const credit = line.credit || 0;
      accountRepo.update(line.accountId, {
        debitBalance: (account.debitBalance || 0) + debit,
        creditBalance: (account.creditBalance || 0) + credit,
        currentBalance: (account.currentBalance || 0) + debit - credit,
      });
    }
  }
}
