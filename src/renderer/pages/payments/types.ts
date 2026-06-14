/**
 * Payments Received module types
 */

export interface PaymentReceived {
  id: string;
  paymentNumber: string;
  customerId?: string;
  customerName?: string;
  amount: number;
  paymentDate: string;
  paymentMethod?: string;
  referenceNumber?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  status: "completed" | "pending" | "refunded";
  notes?: string;
  createdAt: string;
}
