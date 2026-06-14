/**
 * Recurring Invoices module types
 */

export interface RecurringInvoice {
  id: string;
  templateName: string;
  customerId: string;
  customerName?: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  nextInvoiceDate: string;
  lastInvoiceDate?: string;
  lineItems: any[];
  totalAmount: number;
  isActive: boolean;
  invoicesGenerated: number;
  createdAt: string;
}
