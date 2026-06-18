/**
 * Contracts Types — aligned with cloud IContract model
 */

export interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  customerId?: string;
  customerName?: string;
  vendorName?: string;
  description?: string;
  startDate: string;
  endDate?: string;
  contractValue: number;
  value: number; // display alias
  currency?: string;
  contractType: "standard" | "retainer";
  type: string; // display alias
  status: "draft" | "active" | "paused" | "expired" | "renewed" | "terminated";
  billingFrequency: string; // extracted from billingSchedule
  autoRenew: boolean; // extracted from renewal
  lineItems?: any[];
  billingSchedule?: any;
  renewal?: any;
  retainer?: any;
  projectId?: string;
  invoicesGenerated?: number;
  totalBilled?: number;
  terminationReason?: string;
  terminatedAt?: string;
  createdAt: string;
}

export const CONTRACT_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  expired: "bg-orange-100 text-orange-700",
  renewed: "bg-blue-100 text-blue-700",
  terminated: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-700",
};

export const CONTRACT_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "retainer", label: "Retainer" },
] as const;

export const BILLING_FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi-annually", label: "Semi-Annually" },
  { value: "annually", label: "Annually" },
] as const;
