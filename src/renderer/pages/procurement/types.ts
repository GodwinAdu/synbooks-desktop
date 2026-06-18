/**
 * Procurement Types
 * Field names aligned with cloud MongoDB models for sync compatibility.
 */

export interface Requisition {
  id: string;
  requisitionNumber: string;
  requesterId?: string;
  requestedBy?: string; // display alias
  description?: string;
  costCenter?: string;
  department?: string;
  requestedDeliveryDate?: string;
  requiredDate?: string; // display alias
  items: RequisitionItem[];
  totalEstimatedAmount: number;
  totalAmount?: number; // display alias
  status: "draft" | "pending_approval" | "approved" | "rejected" | "converted_to_po" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  currentApprovalLevel?: number;
  approvalHistory?: any[];
  rejectionReason?: string;
  linkedPOId?: string;
  notes?: string;
  createdAt: string;
}

export interface RequisitionItem {
  description: string;
  productName?: string; // display alias
  quantity: number;
  unitOfMeasure: string;
  unit?: string; // display alias
  estimatedUnitPrice: number;
  estimatedCost?: number; // display alias
  estimatedAmount: number;
  preferredVendorId?: string;
  vendorName?: string;
}

export interface GoodsReceived {
  id: string;
  grnNumber: string;
  purchaseOrderId?: string;
  poNumber?: string;
  receiptDate?: string;
  receivedDate?: string; // display alias
  receivedBy?: string;
  deliveryNoteRef?: string;
  vendorName?: string;
  items: GRNItem[];
  status: "draft" | "confirmed" | "cancelled" | "pending_inspection" | "accepted";
  confirmedAt?: string;
  confirmedBy?: string;
  notes?: string;
  createdAt: string;
}

export interface GRNItem {
  poLineIndex: number;
  quantityReceived: number;
  quantityRejected: number;
  rejectionReason?: string;
  // Extra fields for display (not in cloud model but kept for UX)
  productId?: string;
  productName?: string;
  orderedQuantity?: number;
  acceptedQuantity?: number;
  receivedQuantity?: number;
  unit?: string;
}

export const REQ_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending_approval: "bg-amber-100 text-amber-700",
  submitted: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  converted_to_po: "bg-purple-100 text-purple-700",
  ordered: "bg-purple-100 text-purple-700",
  cancelled: "bg-gray-100 text-gray-700",
};

export const GRN_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending_inspection: "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  accepted: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  partial: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
};
