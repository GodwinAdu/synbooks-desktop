/**
 * Desktop Plan Definitions
 * 
 * Simple 3-tier annual licensing model for the Ghana market.
 * Each tier unlocks a fixed set of modules. No per-module add-ons.
 * Cloud sync is an Enterprise bonus.
 */

export interface PlanDefinition {
  id: string;
  name: string;
  description: string;
  modules: string[];
  price: { monthly: number; annual: number };
  cloudSync: boolean;
  maxUsers: number;
  color: string;
}

// ─── Free modules (always available, even without license) ─────────────────

export const FREE_MODULES = ["accounting", "banking", "reports"] as const;

// ─── Plan tiers ────────────────────────────────────────────────────────────

export const PLANS: Record<string, PlanDefinition> = {
  trial: {
    id: "trial",
    name: "Free Trial",
    description: "14-day full access — all modules unlocked",
    modules: ["accounting", "banking", "sales", "expenses", "products", "payroll", "pos", "reports", "projects", "crm", "budgets", "assets", "contracts", "production", "procurement"],
    price: { monthly: 0, annual: 0 },
    cloudSync: true,
    maxUsers: 5,
    color: "blue",
  },
  free: {
    id: "free",
    name: "Free",
    description: "Basic accounting after trial expires",
    modules: ["accounting", "banking", "reports"],
    price: { monthly: 0, annual: 0 },
    cloudSync: false,
    maxUsers: 1,
    color: "gray",
  },
  starter: {
    id: "starter",
    name: "Starter",
    description: "For small businesses and sole traders",
    modules: ["accounting", "banking", "sales", "expenses", "reports"],
    price: { monthly: 50, annual: 600 },
    cloudSync: false,
    maxUsers: 2,
    color: "emerald",
  },
  business: {
    id: "business",
    name: "Business",
    description: "For growing businesses with inventory & staff",
    modules: ["accounting", "banking", "sales", "expenses", "products", "payroll", "pos", "reports", "crm", "projects"],
    price: { monthly: 150, annual: 1800 },
    cloudSync: false,
    maxUsers: 10,
    color: "blue",
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Everything included + Cloud Sync",
    modules: ["accounting", "banking", "sales", "expenses", "products", "payroll", "pos", "reports", "crm", "projects", "budgets", "assets", "contracts", "production", "procurement"],
    price: { monthly: 300, annual: 3600 },
    cloudSync: true,
    maxUsers: 999,
    color: "purple",
  },
};

// All module IDs
export const ALL_MODULES = [
  "accounting", "banking", "sales", "expenses", "products",
  "payroll", "pos", "reports", "projects", "crm",
  "budgets", "assets", "contracts", "production", "procurement",
] as const;

export type ModuleId = typeof ALL_MODULES[number];

// Module display info
export const MODULE_INFO: Record<string, { name: string; description: string }> = {
  accounting: { name: "Accounting", description: "Chart of accounts, journal entries, general ledger" },
  banking: { name: "Banking", description: "Bank accounts, transactions, reconciliation" },
  sales: { name: "Sales & Invoicing", description: "Invoices, customers, estimates, payments" },
  expenses: { name: "Expenses & Bills", description: "Expenses, bills, vendors, purchase orders" },
  products: { name: "Products & Inventory", description: "Product catalog, stock, reorder alerts" },
  payroll: { name: "Payroll & HR", description: "Employees, payroll runs, leave, time tracking" },
  pos: { name: "Point of Sale", description: "POS terminal, receipts, sessions" },
  reports: { name: "Reports", description: "Financial statements and analytics" },
  projects: { name: "Projects", description: "Project management and tracking" },
  crm: { name: "CRM", description: "Contacts, deals, pipeline" },
  budgets: { name: "Budgeting", description: "Budget planning and variance" },
  assets: { name: "Fixed Assets", description: "Asset register and depreciation" },
  contracts: { name: "Contracts", description: "Contract management and billing" },
  production: { name: "Production", description: "Manufacturing, BOMs, work orders" },
  procurement: { name: "Procurement", description: "Requisitions, goods receiving" },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

export function getPlan(planId: string): PlanDefinition {
  return PLANS[planId] || PLANS.free;
}

export function canAccessModule(planId: string, moduleId: string): boolean {
  const plan = getPlan(planId);
  return plan.modules.includes(moduleId);
}
