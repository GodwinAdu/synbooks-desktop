export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  bomId?: string;
  bomName?: string;
  productId?: string;
  productName?: string;
  quantity: number;
  completedQuantity: number;
  rejectedQuantity: number;
  startDate?: string;
  dueDate?: string;
  completedDate?: string;
  status: "draft" | "planned" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  workCenterId?: string;
  workCenterName?: string;
  estimatedCost: number;
  actualCost: number;
  notes?: string;
  createdAt: string;
}

export interface BillOfMaterials {
  id: string;
  bomNumber: string;
  name: string;
  productId?: string;
  productName?: string;
  outputQuantity: number;
  outputUnit: string;
  materials: BOMaterial[];
  costPerUnit: number;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export interface BOMaterial {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  wastagePercent: number;
}

export interface WorkCenter {
  id: string;
  name: string;
  code?: string;
  type: "machine" | "workstation" | "assembly_line" | "manual";
  capacity: number;
  capacityUnit: string;
  costPerHour: number;
  status: "active" | "maintenance" | "inactive";
  location?: string;
  notes?: string;
  createdAt: string;
}

export const WO_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  planned: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};
