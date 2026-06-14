/**
 * Estimates module types
 */

export interface Estimate {
  id: string;
  estimateNumber: string;
  customerId: string;
  customerName?: string;
  estimateDate: string;
  expiryDate?: string;
  lineItems: any[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted";
  notes?: string;
  createdAt: string;
}
