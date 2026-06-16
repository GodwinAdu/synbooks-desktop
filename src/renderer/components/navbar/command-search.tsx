/**
 * Command Search (Ctrl+K)
 * Quick navigation and search across all modules.
 */

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Landmark,
  FileText,
  Receipt,
  ShoppingCart,
  Users,
  Briefcase,
  BarChart3,
  FolderKanban,
  PiggyBank,
  Building2,
  Handshake,
  Factory,
  Truck,
  ScrollText,
  Settings,
  CreditCard,
  Store,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface NavItem {
  title: string;
  path: string;
  icon: any;
  keywords: string[];
}

const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard, keywords: ["home", "overview", "dashboard"] },
  { title: "Chart of Accounts", path: "/accounts", icon: BookOpen, keywords: ["accounts", "coa", "ledger", "chart"] },
  { title: "Journal Entries", path: "/journal-entries", icon: BookOpen, keywords: ["journal", "entries", "debit", "credit"] },
  { title: "General Ledger", path: "/general-ledger", icon: BookOpen, keywords: ["ledger", "gl", "transactions"] },
  { title: "Banking", path: "/banking", icon: Landmark, keywords: ["bank", "accounts", "transactions", "reconcile"] },
  { title: "Invoices", path: "/invoices", icon: FileText, keywords: ["invoice", "billing", "sales", "send"] },
  { title: "Customers", path: "/customers", icon: Users, keywords: ["customer", "client", "buyer"] },
  { title: "Estimates", path: "/estimates", icon: FileText, keywords: ["estimate", "quote", "proposal"] },
  { title: "Payments", path: "/payments", icon: CreditCard, keywords: ["payment", "received", "collected"] },
  { title: "Credit Notes", path: "/credit-notes", icon: FileText, keywords: ["credit", "note", "refund"] },
  { title: "Recurring Invoices", path: "/recurring-invoices", icon: FileText, keywords: ["recurring", "auto", "subscription"] },
  { title: "Expenses", path: "/expenses", icon: Receipt, keywords: ["expense", "spend", "cost"] },
  { title: "Bills", path: "/bills", icon: Receipt, keywords: ["bill", "payable", "vendor"] },
  { title: "Vendors", path: "/vendors", icon: Users, keywords: ["vendor", "supplier", "payee"] },
  { title: "Purchase Orders", path: "/purchase-orders", icon: ShoppingCart, keywords: ["purchase", "order", "po", "buy"] },
  { title: "Recurring Expenses", path: "/recurring-expenses", icon: Receipt, keywords: ["recurring", "expense", "auto"] },
  { title: "Products & Services", path: "/products", icon: ShoppingCart, keywords: ["product", "service", "item", "sku"] },
  { title: "Inventory", path: "/inventory", icon: ShoppingCart, keywords: ["inventory", "stock", "warehouse"] },
  { title: "Employees", path: "/employees", icon: Users, keywords: ["employee", "staff", "worker", "hr"] },
  { title: "Payroll", path: "/payroll", icon: Briefcase, keywords: ["payroll", "salary", "wage", "pay"] },
  { title: "Time Tracking", path: "/time-tracking", icon: Briefcase, keywords: ["time", "hours", "timesheet"] },
  { title: "Reports", path: "/reports", icon: BarChart3, keywords: ["report", "analytics", "financial", "statement"] },
  { title: "Projects", path: "/projects", icon: FolderKanban, keywords: ["project", "task", "work"] },
  { title: "Budgets", path: "/budgets", icon: PiggyBank, keywords: ["budget", "plan", "forecast"] },
  { title: "Fixed Assets", path: "/assets", icon: Building2, keywords: ["asset", "depreciation", "fixed"] },
  { title: "CRM", path: "/crm", icon: Handshake, keywords: ["crm", "contact", "deal", "lead", "pipeline"] },
  { title: "Point of Sale", path: "/pos", icon: Store, keywords: ["pos", "sale", "register", "terminal", "retail"] },
  { title: "Production", path: "/production", icon: Factory, keywords: ["production", "manufacturing", "bom", "work order"] },
  { title: "Procurement", path: "/procurement", icon: Truck, keywords: ["procurement", "requisition", "goods"] },
  { title: "Contracts", path: "/contracts", icon: ScrollText, keywords: ["contract", "agreement", "renewal"] },
  { title: "Settings", path: "/settings", icon: Settings, keywords: ["settings", "config", "preferences", "company"] },
];

interface CommandSearchProps {
  open: boolean;
  onClose: () => void;
}

export function CommandSearch({ open, onClose }: CommandSearchProps) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    if (!query.trim()) return NAV_ITEMS;
    const q = query.toLowerCase();
    return NAV_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.keywords.some((kw) => kw.includes(q))
    );
  }, [query]);

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
    setQuery("");
  };

  // Keyboard navigation
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      handleSelect(filtered[selectedIndex].path);
    }
  };

  // Global Ctrl+K handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (open) {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, modules..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-11 text-sm"
            autoFocus
          />
        </div>
        <div className="max-h-[320px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No results found
            </div>
          ) : (
            filtered.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => handleSelect(item.path)}
                  className={`flex items-center gap-3 w-full px-4 py-2.5 text-left text-sm transition-colors ${
                    index === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1">{item.title}</span>
                  {index === selectedIndex && (
                    <span className="text-[10px] text-muted-foreground">↵</span>
                  )}
                </button>
              );
            })
          )}
        </div>
        <div className="border-t px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
