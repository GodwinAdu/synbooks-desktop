/**
 * App Router
 * Main application routing - uses React Router for the desktop app.
 * Each page is a module folder with barrel exports.
 */

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/auth-context";
import { LoginPage } from "./pages/auth/login";
import { RegisterPage } from "./pages/auth/register";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { DashboardPage } from "./pages/dashboard";
import { InvoicesPage } from "./pages/invoices";
import { ExpensesPage } from "./pages/expenses";
import { BillsPage } from "./pages/bills";
import { CustomersPage } from "./pages/customers";
import { VendorsPage } from "./pages/vendors";
import { ProductsPage } from "./pages/products";
import { AccountsPage } from "./pages/accounts";
import { EmployeesPage } from "./pages/employees";
import { PayrollPage } from "./pages/payroll";
import { BankingPage } from "./pages/banking";
import { JournalEntriesPage } from "./pages/journal-entries";
import { GeneralLedgerPage } from "./pages/general-ledger";
import { ReportsPage } from "./pages/reports";
import { ProjectsPage } from "./pages/projects";
import { BudgetsPage } from "./pages/budgets";
import { AssetsPage } from "./pages/assets";
import { CRMPage } from "./pages/crm";
import { POSPage } from "./pages/pos";
import { SettingsPage } from "./pages/settings";
import { PeriodClosePage } from "./pages/period-close";
import { RecurringJournalsPage } from "./pages/recurring-journals";
import { YearEndClosePage } from "./pages/year-end-close";
import { EstimatesPage } from "./pages/estimates";
import { PaymentsPage } from "./pages/payments";
import { CreditNotesPage } from "./pages/credit-notes";
import { SalesOrdersPage } from "./pages/sales-orders";
import { RecurringInvoicesPage } from "./pages/recurring-invoices";
import { PurchaseOrdersPage } from "./pages/purchase-orders";
import { RecurringExpensesPage } from "./pages/recurring-expenses";
import { ExpenseCategoriesPage } from "./pages/expense-categories";
import { ProductCategoriesPage } from "./pages/product-categories";
import { InventoryPage } from "./pages/inventory";
import { StockAdjustmentsPage } from "./pages/stock-adjustments";
import { ReorderAlertsPage } from "./pages/reorder-alerts";
import { PayrollHistoryPage } from "./pages/payroll-history";
import { DeductionsPage } from "./pages/deductions";
import { TimeTrackingPage } from "./pages/time-tracking";
import { LeaveManagementPage } from "./pages/leave-management";
import { ProductionPage } from "./pages/production";
import { ProcurementPage } from "./pages/procurement";
import { ContractsPage } from "./pages/contracts";
import { ProfilePage } from "./pages/profile";
import { HelpPage } from "./pages/help";
import { UpgradeGate } from "./components/commons/upgrade-gate";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-5">
          {/* Animated Logo */}
          <div className="relative">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-pulse">
              <span className="text-white text-2xl font-bold">S</span>
            </div>
            {/* Spinning ring */}
            <div className="absolute -inset-2 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 animate-spin" style={{ animationDuration: '3s', borderTopColor: 'transparent', borderRightColor: 'transparent' }} />
          </div>
          {/* Brand name */}
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              SyncBooks
            </h1>
            <p className="text-xs text-muted-foreground">Desktop Accounting</p>
          </div>
          {/* Loading dots */}
          <div className="flex items-center gap-1.5">
            <div className="size-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="size-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="size-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected app routes */}
      <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        {/* Accounting module */}
        <Route path="accounts" element={<UpgradeGate moduleId="accounting" moduleName="Accounting"><AccountsPage /></UpgradeGate>} />
        <Route path="journal-entries" element={<UpgradeGate moduleId="accounting" moduleName="Accounting"><JournalEntriesPage /></UpgradeGate>} />
        <Route path="general-ledger" element={<UpgradeGate moduleId="accounting" moduleName="Accounting"><GeneralLedgerPage /></UpgradeGate>} />
        <Route path="period-close" element={<UpgradeGate moduleId="accounting" moduleName="Accounting"><PeriodClosePage /></UpgradeGate>} />
        <Route path="recurring-journals" element={<UpgradeGate moduleId="accounting" moduleName="Accounting"><RecurringJournalsPage /></UpgradeGate>} />
        <Route path="year-end-close" element={<UpgradeGate moduleId="accounting" moduleName="Accounting"><YearEndClosePage /></UpgradeGate>} />
        {/* Banking */}
        <Route path="banking" element={<UpgradeGate moduleId="banking" moduleName="Banking"><BankingPage /></UpgradeGate>} />
        {/* Sales module */}
        <Route path="invoices" element={<UpgradeGate moduleId="sales" moduleName="Sales & Invoicing"><InvoicesPage /></UpgradeGate>} />
        <Route path="customers" element={<UpgradeGate moduleId="sales" moduleName="Sales & Invoicing"><CustomersPage /></UpgradeGate>} />
        <Route path="estimates" element={<UpgradeGate moduleId="sales" moduleName="Sales & Invoicing"><EstimatesPage /></UpgradeGate>} />
        <Route path="payments" element={<UpgradeGate moduleId="sales" moduleName="Sales & Invoicing"><PaymentsPage /></UpgradeGate>} />
        <Route path="credit-notes" element={<UpgradeGate moduleId="sales" moduleName="Sales & Invoicing"><CreditNotesPage /></UpgradeGate>} />
        <Route path="sales-orders" element={<UpgradeGate moduleId="sales" moduleName="Sales & Invoicing"><SalesOrdersPage /></UpgradeGate>} />
        <Route path="recurring-invoices" element={<UpgradeGate moduleId="sales" moduleName="Sales & Invoicing"><RecurringInvoicesPage /></UpgradeGate>} />
        {/* Expenses module */}
        <Route path="expenses" element={<UpgradeGate moduleId="expenses" moduleName="Expenses & Bills"><ExpensesPage /></UpgradeGate>} />
        <Route path="bills" element={<UpgradeGate moduleId="expenses" moduleName="Expenses & Bills"><BillsPage /></UpgradeGate>} />
        <Route path="vendors" element={<UpgradeGate moduleId="expenses" moduleName="Expenses & Bills"><VendorsPage /></UpgradeGate>} />
        <Route path="purchase-orders" element={<UpgradeGate moduleId="expenses" moduleName="Expenses & Bills"><PurchaseOrdersPage /></UpgradeGate>} />
        <Route path="recurring-expenses" element={<UpgradeGate moduleId="expenses" moduleName="Expenses & Bills"><RecurringExpensesPage /></UpgradeGate>} />
        <Route path="expense-categories" element={<UpgradeGate moduleId="expenses" moduleName="Expenses & Bills"><ExpenseCategoriesPage /></UpgradeGate>} />
        {/* Products module */}
        <Route path="products" element={<UpgradeGate moduleId="products" moduleName="Products & Services"><ProductsPage /></UpgradeGate>} />
        <Route path="product-categories" element={<UpgradeGate moduleId="products" moduleName="Products & Services"><ProductCategoriesPage /></UpgradeGate>} />
        <Route path="inventory" element={<UpgradeGate moduleId="products" moduleName="Products & Services"><InventoryPage /></UpgradeGate>} />
        <Route path="stock-adjustments" element={<UpgradeGate moduleId="products" moduleName="Products & Services"><StockAdjustmentsPage /></UpgradeGate>} />
        <Route path="reorder-alerts" element={<UpgradeGate moduleId="products" moduleName="Products & Services"><ReorderAlertsPage /></UpgradeGate>} />
        {/* Payroll module */}
        <Route path="employees" element={<UpgradeGate moduleId="payroll" moduleName="Payroll"><EmployeesPage /></UpgradeGate>} />
        <Route path="payroll" element={<UpgradeGate moduleId="payroll" moduleName="Payroll"><PayrollPage /></UpgradeGate>} />
        <Route path="payroll-history" element={<UpgradeGate moduleId="payroll" moduleName="Payroll"><PayrollHistoryPage /></UpgradeGate>} />
        <Route path="deductions" element={<UpgradeGate moduleId="payroll" moduleName="Payroll"><DeductionsPage /></UpgradeGate>} />
        <Route path="time-tracking" element={<UpgradeGate moduleId="payroll" moduleName="Payroll"><TimeTrackingPage /></UpgradeGate>} />
        <Route path="leave-management" element={<UpgradeGate moduleId="payroll" moduleName="Payroll"><LeaveManagementPage /></UpgradeGate>} />
        {/* Other modules */}
        <Route path="reports/*" element={<UpgradeGate moduleId="reports" moduleName="Reports"><ReportsPage /></UpgradeGate>} />
        <Route path="projects/*" element={<UpgradeGate moduleId="projects" moduleName="Projects"><ProjectsPage /></UpgradeGate>} />
        <Route path="budgets" element={<UpgradeGate moduleId="budgets" moduleName="Budgeting"><BudgetsPage /></UpgradeGate>} />
        <Route path="assets" element={<UpgradeGate moduleId="assets" moduleName="Fixed Assets"><AssetsPage /></UpgradeGate>} />
        <Route path="crm/*" element={<UpgradeGate moduleId="crm" moduleName="CRM"><CRMPage /></UpgradeGate>} />
        <Route path="pos/*" element={<UpgradeGate moduleId="pos" moduleName="Point of Sale"><POSPage /></UpgradeGate>} />
        <Route path="production/*" element={<UpgradeGate moduleId="production" moduleName="Production"><ProductionPage /></UpgradeGate>} />
        <Route path="procurement/*" element={<UpgradeGate moduleId="procurement" moduleName="Procurement"><ProcurementPage /></UpgradeGate>} />
        <Route path="contracts" element={<UpgradeGate moduleId="contracts" moduleName="Contracts"><ContractsPage /></UpgradeGate>} />
        {/* Settings & Profile - always accessible */}
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="help" element={<HelpPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
