/**
 * Recurring Expenses module types
 */

export interface RecurringExpense {
  id: string;
  name: string;
  number?: string;
  amount: number;
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  vendorId?: string;
  vendorName?: string;
  categoryId?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  nextRunDate?: string;
  nextExpenseDate: string;
  lastGeneratedAt?: string;
  isActive: boolean | number;
  notes?: string;
  createdAt: string;
}
