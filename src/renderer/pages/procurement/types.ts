export interface Requisition {
  id: string;
  requisitionNumber: string;
  requestedBy: string;
  department?: string;
  items: RequisitionItem[];
  totalAmount: number;
  status: "draft" | "submitted" | "approved" | "rejected" | "ordered";
  priority: "low" | "normal" | "high" | "urgent";
  requiredDate?: string;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface RequisitionItem {
  productId?: string;
  productName: string;
  quantity: number;
  unit: string;
  estimatedCost: number;
  vendorId?: string;
  vendorName?: string;
}

export interface GoodsReceived {
  id: string;
  grnNumber: string;
  purchaseOrderId?: string;
  poNumber?: string;
  vendorId?: string;
  vendorName?: string;
  receivedDate: string;
  items: GRNItem[];
  status: "pending_inspection" | "accepted" | "partial" | "rejected";
  receivedBy?: string;
  notes?: string;
  createdAt: string;
}

export interface GRNItem {
  productId: string;
  productName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  unit: string;
}

export const REQ_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  ordered: "bg-purple-100 text-purple-700",
};

export const GRN_STATUS_COLORS: Record<string, string> = {
  pending_inspection: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
  partial: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
};
