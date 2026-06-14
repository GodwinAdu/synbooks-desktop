/**
 * Credit Notes module types
 */

export interface CreditNote {
  id: string;
  creditNoteNumber: string;
  customerId: string;
  customerName?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  creditNoteDate: string;
  lineItems: any[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: "draft" | "issued" | "applied" | "voided";
  reason?: string;
  createdAt: string;
}
