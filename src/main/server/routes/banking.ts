import { Router, Response } from 'express';
import { Repository } from '../../database/repository';
import { AuthenticatedRequest } from '../middleware/local-auth';

export const bankingRouter = Router();
const accountRepo = new Repository<any>('bank_accounts');
const txnRepo = new Repository<any>('bank_transactions');

// Bank Accounts
bankingRouter.get('/accounts', (req: AuthenticatedRequest, res: Response) => {
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  res.json(accountRepo.find({ where, orderBy: 'accountName', order: 'ASC' }));
});

bankingRouter.get('/accounts/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = accountRepo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) { res.status(404).json({ error: 'Bank account not found' }); return; }
  res.json(item);
});

bankingRouter.post('/accounts', (req: AuthenticatedRequest, res: Response) => {
  try {
    const item = accountRepo.create({ ...req.body, organizationId: req.organizationId, createdBy: req.userId });
    res.status(201).json({ success: true, data: item });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

bankingRouter.put('/accounts/:id', (req: AuthenticatedRequest, res: Response) => {
  const existing = accountRepo.findById(req.params.id);
  if (!existing || existing.organizationId !== req.organizationId) { res.status(404).json({ error: 'Bank account not found' }); return; }
  res.json({ success: true, data: accountRepo.update(req.params.id, { ...req.body, modifiedBy: req.userId }) });
});

// Transactions
bankingRouter.get('/transactions', (req: AuthenticatedRequest, res: Response) => {
  const { page = '1', pageSize = '50', bankAccountId, type, reconciled } = req.query;
  const where: Record<string, any> = { organizationId: req.organizationId, del_flag: 0 };
  if (bankAccountId) where.bankAccountId = bankAccountId;
  if (type) where.transactionType = type;
  if (reconciled !== undefined) where.isReconciled = reconciled === 'true' ? 1 : 0;
  res.json(txnRepo.findPaginated({ where, orderBy: 'transactionDate', order: 'DESC', page: parseInt(page as string), pageSize: parseInt(pageSize as string) }));
});

bankingRouter.get('/transactions/:id', (req: AuthenticatedRequest, res: Response) => {
  const item = txnRepo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) { res.status(404).json({ error: 'Transaction not found' }); return; }
  res.json(item);
});

bankingRouter.post('/transactions', (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = txnRepo.count({ organizationId: req.organizationId });
    const transactionNumber = req.body.transactionNumber || `TXN-${String(count + 1).padStart(6, '0')}`;
    const item = txnRepo.create({ ...req.body, organizationId: req.organizationId, transactionNumber, createdBy: req.userId });

    // Update bank account balance
    const bankAccount = accountRepo.findById(req.body.bankAccountId);
    if (bankAccount) {
      const balanceChange = req.body.transactionType === 'deposit' || req.body.transactionType === 'interest'
        ? req.body.amount : -req.body.amount;
      accountRepo.update(bankAccount.id, { currentBalance: (bankAccount.currentBalance || 0) + balanceChange });
    }

    res.status(201).json({ success: true, data: item });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

bankingRouter.post('/transactions/:id/reconcile', (req: AuthenticatedRequest, res: Response) => {
  const item = txnRepo.findById(req.params.id);
  if (!item || item.organizationId !== req.organizationId) { res.status(404).json({ error: 'Transaction not found' }); return; }
  txnRepo.update(req.params.id, { isReconciled: 1, reconciledDate: new Date().toISOString() });
  res.json({ success: true, message: 'Transaction reconciled' });
});
