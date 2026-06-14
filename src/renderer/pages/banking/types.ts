export interface BankAccount {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber?: string;
  accountType: string;
  currency: string;
  currentBalance: number;
  isActive: boolean;
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  transactionNumber: string;
  transactionDate: string;
  transactionType:
    | "deposit"
    | "withdrawal"
    | "transfer"
    | "fee"
    | "interest"
    | "other";
  amount: number;
  description: string;
  payee?: string;
  referenceNumber?: string;
  category?: string;
  isReconciled: boolean;
  reconciledDate?: string;
}

export interface BankRule {
  id: string;
  name: string;
  pattern: string;
  matchField: "description" | "payee" | "reference";
  category: string;
  accountId?: string;
  isActive: boolean;
}

export type BankingView =
  | "overview"
  | "transactions"
  | "create-account"
  | "create-transaction"
  | "transfer"
  | "reconciliation"
  | "rules";
