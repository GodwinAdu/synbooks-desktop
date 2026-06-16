export interface Project {
  id: string;
  name: string;
  description?: string;
  projectNumber?: string;
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled";
  startDate?: string;
  endDate?: string;
  budget: number;
  actualCost: number;
  revenue: number;
  completionPercentage: number;
  managerId?: string;
  managerName?: string;
  color?: string;
  customerId?: string;
  customerName?: string;
  createdAt: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "normal" | "high" | "urgent";
  assignedTo?: string;
  dueDate?: string;
  completedAt?: string;
  sortOrder: number;
}

export const STATUS_COLORS: Record<string, string> = {
  planning: "#3b82f6",
  active: "#10b981",
  on_hold: "#f59e0b",
  completed: "#6b7280",
  cancelled: "#ef4444",
};

export const STATUS_BG: Record<string, string> = {
  planning: "bg-blue-100 text-blue-700",
  active: "bg-emerald-100 text-emerald-700",
  on_hold: "bg-yellow-100 text-yellow-700",
  completed: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
};
