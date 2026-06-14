export interface Account {
  id: string;
  organizationId: string;
  accountCode: string;
  accountName: string;
  accountType: "asset" | "liability" | "equity" | "revenue" | "expense";
  accountSubType: string;
  parentAccountId?: string;
  level: number;
  isParent: boolean;
  currency: string;
  currentBalance: number;
  debitBalance: number;
  creditBalance: number;
  isActive: boolean;
  isSystemAccount: boolean;
  allowManualJournal: boolean;
  del_flag: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
