/**
 * Navigation items configuration
 * Mirrors the Next.js app's nav-main.tsx structure.
 * Separated into its own file for easy maintenance.
 */

import {
  BarChart3, BookMarked, BookOpen, FileText, CreditCard, Wallet, Receipt,
  ArrowLeftRight, TrendingUp, HandCoins, Repeat, UsersRound,
  ShoppingBag, FileCheck, Users, DollarSign, Calculator,
  Package, History, Clock, Calendar, Settings, Briefcase,
  Target, Building, MonitorSmartphone, Boxes,
  Bell, Warehouse, Factory, Truck, FileSignature, HelpCircle, type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  description?: string;
  isNew?: boolean;
  isPro?: boolean;
  items?: NavSubItem[];
}

export interface NavSubItem {
  title: string;
  url: string;
  icon: LucideIcon;
  isNew?: boolean;
}

export const navItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: BarChart3,
    description: "Financial overview",
  },
  {
    title: "Accounting",
    url: "#",
    icon: BookMarked,
    description: "Chart of accounts & ledger",
    items: [
      { title: "Chart of Accounts", url: "/accounts", icon: BookOpen },
      { title: "Journal Entries", url: "/journal-entries", icon: FileText },
      { title: "General Ledger", url: "/general-ledger", icon: BookMarked },
      { title: "Period Close", url: "/period-close", icon: FileCheck, isNew: true },
      { title: "Recurring Journals", url: "/recurring-journals", icon: Repeat, isNew: true },
      { title: "Year-End Close", url: "/year-end-close", icon: Calendar, isNew: true },
    ],
  },
  {
    title: "Banking",
    url: "/banking",
    icon: CreditCard,
    description: "Bank accounts & transactions",
  },
  {
    title: "Sales & Invoicing",
    url: "#",
    icon: Receipt,
    description: "Invoices & customer payments",
    items: [
      { title: "Invoices", url: "/invoices", icon: FileText },
      { title: "Recurring Invoices", url: "/recurring-invoices", icon: Repeat, isNew: true },
      { title: "Customers", url: "/customers", icon: Users },
      { title: "Estimates", url: "/estimates", icon: Calculator },
      { title: "Payments Received", url: "/payments", icon: DollarSign },
      { title: "Credit Notes", url: "/credit-notes", icon: FileText, isNew: true },
      { title: "Sales Orders", url: "/sales-orders", icon: ShoppingBag, isNew: true },
    ],
  },
  {
    title: "Expenses & Bills",
    url: "#",
    icon: HandCoins,
    description: "Bills & vendor payments",
    items: [
      { title: "Expenses", url: "/expenses", icon: Receipt },
      { title: "Recurring Expenses", url: "/recurring-expenses", icon: Repeat, isNew: true },
      { title: "Bills", url: "/bills", icon: FileText },
      { title: "Vendors", url: "/vendors", icon: UsersRound },
      { title: "Purchase Orders", url: "/purchase-orders", icon: ShoppingBag },
      { title: "Expense Categories", url: "/expense-categories", icon: Boxes, isNew: true },
    ],
  },
  {
    title: "Products & Services",
    url: "#",
    icon: Package,
    description: "Product catalog & inventory",
    items: [
      { title: "All Products", url: "/products", icon: Package },
      { title: "Categories", url: "/product-categories", icon: Boxes },
      { title: "Inventory", url: "/inventory", icon: Warehouse },
      { title: "Stock Adjustments", url: "/stock-adjustments", icon: ArrowLeftRight, isNew: true },
      { title: "Reorder Alerts", url: "/reorder-alerts", icon: Bell, isNew: true },
    ],
  },
  {
    title: "Payroll",
    url: "#",
    icon: Wallet,
    description: "Employee payroll management",
    items: [
      { title: "Employees", url: "/employees", icon: Users },
      { title: "Run Payroll", url: "/payroll", icon: DollarSign },
      { title: "Payroll History", url: "/payroll-history", icon: History },
      { title: "Deductions", url: "/deductions", icon: Calculator, isNew: true },
      { title: "Time Tracking", url: "/time-tracking", icon: Clock },
      { title: "Leave Management", url: "/leave-management", icon: Calendar },
    ],
  },
  {
    title: "Point of Sale",
    url: "/pos",
    icon: MonitorSmartphone,
    description: "POS terminal & sales",
    isNew: true,
  },
  {
    title: "Reports",
    url: "#",
    icon: BarChart3,
    description: "Financial statements & analytics",
    items: [
      { title: "Income Statement", url: "/reports/profit-loss", icon: TrendingUp },
      { title: "Balance Sheet", url: "/reports/balance-sheet", icon: BarChart3 },
      { title: "Trial Balance", url: "/reports/trial-balance", icon: Calculator },
      { title: "Cash Flow", url: "/reports/cash-flow", icon: DollarSign },
      { title: "Aged Receivables", url: "/reports/ar-aging", icon: Clock },
      { title: "Aged Payables", url: "/reports/ap-aging", icon: Clock },
      { title: "Tax Summary", url: "/reports/tax", icon: FileText },
    ],
  },
  {
    title: "Projects",
    url: "/projects",
    icon: Briefcase,
    description: "Project management & tracking",
    isNew: true,
  },
  {
    title: "CRM",
    url: "#",
    icon: Target,
    description: "Customer relationship management",
    isNew: true,
    items: [
      { title: "Contacts", url: "/crm", icon: Users },
      { title: "Deals", url: "/crm/deals", icon: TrendingUp },
      { title: "Pipeline", url: "/crm/pipeline", icon: BarChart3 },
    ],
  },
  {
    title: "Budgeting",
    url: "/budgets",
    icon: Calculator,
    description: "Budget planning & forecasting",
    isPro: true,
  },
  {
    title: "Fixed Assets",
    url: "/assets",
    icon: Building,
    description: "Asset register & depreciation",
  },
  {
    title: "Production",
    url: "/production",
    icon: Factory,
    description: "Manufacturing & work orders",
    isNew: true,
  },
  {
    title: "Procurement",
    url: "/procurement",
    icon: Truck,
    description: "Requisitions & goods receiving",
    isNew: true,
  },
  {
    title: "Contracts",
    url: "/contracts",
    icon: FileSignature,
    description: "Contracts & recurring billing",
    isNew: true,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    description: "Company & user settings",
  },
  {
    title: "Help",
    url: "/help",
    icon: HelpCircle,
    description: "Guides, FAQs & shortcuts",
  },
];
