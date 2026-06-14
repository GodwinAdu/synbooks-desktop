export interface JournalLine {
  accountId: string;
  accountName?: string;
  description: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  lineItems: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  status: "draft" | "posted" | "reversed";
  notes: string;
  createdAt: string;
}
