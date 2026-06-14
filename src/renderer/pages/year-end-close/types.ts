export interface YearEndStatus {
  fiscalYear: number;
  status: "open" | "in_progress" | "completed";
  steps: YearEndStep[];
}

export interface YearEndStep {
  id: string;
  title: string;
  description: string;
  status: "pending" | "completed" | "skipped";
  completedAt?: string;
}
