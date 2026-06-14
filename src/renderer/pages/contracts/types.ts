export interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  customerId?: string;
  customerName?: string;
  vendorId?: string;
  vendorName?: string;
  type: "service" | "subscription" | "retainer" | "project" | "other";
  status: "draft" | "active" | "expired" | "cancelled" | "renewed";
  startDate: string;
  endDate?: string;
  value: number;
  billingFrequency: "one_time" | "weekly" | "monthly" | "quarterly" | "annually";
  autoRenew: boolean;
  renewalTerms?: string;
  description?: string;
  terms?: string;
  createdAt: string;
}

export const CONTRACT_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-emerald-100 text-emerald-700",
  expired: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
  renewed: "bg-blue-100 text-blue-700",
};
