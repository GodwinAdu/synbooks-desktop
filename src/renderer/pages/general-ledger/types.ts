export interface GLTransaction {
  id: string;
  accountId: string;
  accountName: string;
  accountCode: string;
  journalEntryId: string;
  entryNumber: string;
  transactionDate: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  fiscalYear: number;
  fiscalPeriod: number;
  isReconciled: boolean;
}
