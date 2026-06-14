/**
 * Dashboard module types
 */

export interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  activeEmployees: number;
  revenueChange: number | null;
  expensesChange: number | null;
  profitChange: number | null;
  newEmployeesThisMonth: number;
  pendingInvoices: { count: number; amount: number };
  unpaidBills: { count: number; amount: number };
  bankBalance: { total: number; accounts: number };
  accountHealth: { totalAssets: number; totalLiabilities: number; equity: number };
  recentTransactions: Transaction[];
  topCustomers: TopEntity[];
  topVendors: TopEntity[];
  payrollRuns: any[];
  monthlyRevenueExpenses: { month: string; revenue: number; expenses: number }[];
  cashFlowData: { month: string; inflow: number; outflow: number }[];
  weeklyTrend: { day: string; sales: number; expenses: number; profit: number }[];
  expenseByCategory: { name: string; value: number }[];
  receivablesVsPayables: { receivables: number; payables: number };
  profitMarginTrend: { month: string; margin: number }[];
  reminders: Reminder[];
  activityFeed: Activity[];
}

export interface Transaction {
  _id: string;
  description: string;
  amount: number;
  transactionType: string;
  transactionDate: string;
}

export interface TopEntity {
  _id: string;
  name: string;
  amount: number;
}

export interface Reminder {
  id: string;
  title: string;
  date: string;
  type: "urgent" | "warning" | "info";
  description: string;
}

export interface Activity {
  id: string;
  user: string;
  action: string;
  resource: string;
  resourceId: string;
  time: string;
}
