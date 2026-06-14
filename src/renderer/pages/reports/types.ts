export interface AccountLine {
  id: string;
  name: string;
  amount: number;
}

export interface AccountGroup {
  subType: string;
  accounts: AccountLine[];
  subtotal: number;
}

export interface ProfitLossData {
  revenueGroups: AccountGroup[];
  expenseGroups: AccountGroup[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  startDate: string;
  endDate: string;
}

export interface BalanceSheetData {
  assetGroups: AccountGroup[];
  liabilityGroups: AccountGroup[];
  equityGroups: AccountGroup[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  retainedEarnings: number;
  totalLiabilitiesAndEquity: number;
  asOfDate: string;
}

export interface TrialBalanceAccount {
  id: string;
  name: string;
  code: string;
  type: string;
  subType: string;
  totalDebit: number;
  totalCredit: number;
}

export interface TrialBalanceData {
  accounts: TrialBalanceAccount[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  startDate: string;
  endDate: string;
}

export interface CashFlowData {
  operating: {
    revenue: number;
    expenses: number;
    arChange: number;
    apChange: number;
    netOperating: number;
  };
  investing: { assetPurchases: number; netInvesting: number };
  financing: { loanProceeds: number; netFinancing: number };
  netCashChange: number;
  startDate: string;
  endDate: string;
}

export interface AgingEntry {
  id: string;
  customerName?: string;
  vendorName?: string;
  invoiceNumber?: string;
  billNumber?: string;
  dueDate: string;
  totalAmount: number;
  outstanding: number;
  daysOverdue: number;
}

export interface AgingData {
  buckets: {
    current: AgingEntry[];
    days30: AgingEntry[];
    days60: AgingEntry[];
    days90: AgingEntry[];
    over90: AgingEntry[];
  };
  totals: {
    current: number;
    days30: number;
    days60: number;
    days90: number;
    over90: number;
    total: number;
  };
}

export interface TaxSummaryData {
  outputTax: number;
  inputTax: number;
  netTax: number;
  startDate: string;
  endDate: string;
}
