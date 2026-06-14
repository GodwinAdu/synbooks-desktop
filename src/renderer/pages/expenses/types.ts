export interface Expense {
  id: string;
  expenseNumber: string;
  vendorId?: string;
  date: string;
  amount: number;
  taxAmount: number;
  paymentMethod: string;
  description?: string;
  status: "pending" | "approved" | "paid" | "rejected";
  createdAt: string;
}
