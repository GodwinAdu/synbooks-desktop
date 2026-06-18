/**
 * Recurring Invoices module types
 */

export interface RecurringInvoice {
  id: string;
  profileName?: string;
  templateName: string;
  customerId: string;
  customerName?: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  startDate?: string;
  endDate?: string;
  nextRunDate?: string;
  nextInvoiceDate: string;
  lastInvoiceDate?: string;
  lastGeneratedAt?: string;
  lineItems: any[];
  subtotal?: number;
  taxAmount?: number;
  totalAmount: number;
  isActive: boolean | number;
  invoicesGenerated: number;
  notes?: string;
  createdAt: string;
}
