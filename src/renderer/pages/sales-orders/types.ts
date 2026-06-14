/**
 * Sales Orders module types
 */

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName?: string;
  orderDate: string;
  deliveryDate?: string;
  lineItems: any[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: "draft" | "confirmed" | "fulfilled" | "cancelled";
  notes?: string;
  createdAt: string;
}
