export interface Expense {
  id: string;
  expenseNumber: string;
  vendorId?: string;
  vendorName?: string;
  date: string;
  amount: number;
  taxAmount: number;
  taxRate?: number;
  paymentMethod: string;
  description?: string;
  category?: string;
  isReimbursable?: boolean;
  expenseAccountId?: string;
  paymentAccountId?: string;
  projectId?: string;
  notes?: string;
  status: "pending" | "approved" | "paid" | "rejected";
  createdAt: string;
}
