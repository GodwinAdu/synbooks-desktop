export interface Budget {
  id: string;
  name: string;
  fiscalYear: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  totalActual: number;
  status: "draft" | "active" | "closed";
  lines: BudgetLine[];
  createdAt: string;
}

export interface BudgetLine {
  id: string;
  accountId: string;
  accountName: string;
  budgetAmount: number;
  actualAmount: number;
  variance: number;
}
