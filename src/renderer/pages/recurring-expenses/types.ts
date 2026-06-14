export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  vendorId?: string;
  vendorName?: string;
  category?: string;
  nextDueDate: string;
  isActive: boolean;
  createdAt: string;
}
