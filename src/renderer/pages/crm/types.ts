export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  type: "lead" | "customer" | "vendor" | "partner";
  status: "active" | "inactive";
  source?: string;
  notes?: string;
  createdAt: string;
}

export interface Deal {
  id: string;
  title: string;
  contactId?: string;
  contactName?: string;
  amount: number;
  stage: string;
  probability: number;
  expectedCloseDate?: string;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
}

export const DEAL_STAGES = [
  { id: "qualification", label: "Qualification", color: "#3b82f6" },
  { id: "proposal", label: "Proposal", color: "#8b5cf6" },
  { id: "negotiation", label: "Negotiation", color: "#f59e0b" },
  { id: "closed_won", label: "Closed Won", color: "#10b981" },
  { id: "closed_lost", label: "Closed Lost", color: "#ef4444" },
];

export const CONTACT_TYPES = ["lead", "customer", "vendor", "partner"] as const;
export const CONTACT_SOURCES = ["website", "referral", "social_media", "advertisement", "cold_call", "event", "other"] as const;
