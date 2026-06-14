export interface RecurringJournal {
  id: string;
  name: string;
  description: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  nextRunDate: string;
  lastRunDate?: string;
  lineItems: { accountId: string; accountName: string; debit: number; credit: number }[];
  totalAmount: number;
  isActive: boolean;
  createdAt: string;
}
