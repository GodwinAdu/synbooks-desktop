export interface PurchaseOrderLineItem {
  productId?: string;
  description: string;
  quantity: number;
  rate: number;
  taxRate: number;
  amount: number;
  taxAmount: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName?: string;
  orderDate: string;
  expectedDate?: string;
  status: "draft" | "sent" | "received" | "cancelled";
  lineItems: PurchaseOrderLineItem[];
  subtotal: number;
  taxTotal: number;
  totalAmount: number;
  notes?: string;
  createdAt: string;
}
