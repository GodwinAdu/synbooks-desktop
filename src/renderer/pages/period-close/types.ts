export interface FiscalPeriod {
  id: string;
  year: number;
  period: number; // 1-12
  name: string; // e.g. "January 2026"
  startDate: string;
  endDate: string;
  status: "open" | "closed" | "locked";
  closedAt?: string;
  closedBy?: string;
}
