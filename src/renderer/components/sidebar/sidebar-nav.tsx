/**
 * Sidebar Navigation
 * Renders the collapsible navigation menu matching the Next.js version.
 */

import { useState, useEffect, useCallback } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronRight, Search, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { navItems, type NavItem } from "./nav-items";
import { useLicense } from "@/contexts/license-context";

// Map nav items to module IDs for access control
const NAV_MODULE_MAP: Record<string, string> = {
  "Accounting": "accounting",
  "Banking": "banking",
  "Sales & Invoicing": "sales",
  "Expenses & Bills": "expenses",
  "Products & Services": "products",
  "Payroll": "payroll",
  "Point of Sale": "pos",
  "Reports": "reports",
  "Projects": "projects",
  "CRM": "crm",
  "Budgeting": "budgets",
  "Fixed Assets": "assets",
  "Production": "production",
  "Procurement": "procurement",
  "Contracts": "contracts",
};

export function SidebarNav({ collapsed = false }: { collapsed?: boolean }) {
  const location = useLocation();
  const { license, canAccess } = useLicense();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean> | null>(null);

  const isActive = useCallback((url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  }, [location.pathname]);

  // Load module preferences
  useEffect(() => {
    fetch("http://127.0.0.1:45678/api/settings/modules", {
      headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data && Object.keys(data).length > 0) setEnabledModules(data);
      })
      .catch(() => {});
  }, []);

  // Auto-open active group
  useEffect(() => {
    if (openGroup) return;
    const activeGroup = navItems.find((item) =>
      item.items?.some((sub) => isActive(sub.url))
    );
    if (activeGroup) setOpenGroup(activeGroup.title);
  }, [location.pathname, isActive, openGroup]);

  // Filter items by: search, license, and module preferences
  const filteredItems = navItems.filter((item) => {
    // Dashboard and Settings always show
    if (item.title === "Dashboard" || item.title === "Settings") return true;

    // Check module access (license)
    const moduleId = NAV_MODULE_MAP[item.title];
    if (moduleId) {
      // If module preferences exist, respect them
      if (enabledModules && enabledModules[moduleId] === false) return false;
      // Check license access
      if (!canAccess(moduleId)) return false;
    }

    // Search filter
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.items?.some((sub) => sub.title.toLowerCase().includes(q))
    );
  });

  const handleGroupToggle = (title: string) => {
    setOpenGroup((prev) => (prev === title ? null : title));
  };

  return (
    <div className="flex flex-col gap-2 py-2">
      {/* Search (hide when collapsed) */}
      {!collapsed && (
        <div className="px-3 pb-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 bg-background/50 border-border/50 focus:bg-background"
            />
          </div>
        </div>
      )}

      {/* Nav Items */}
      <nav className={cn("flex flex-col gap-0.5", collapsed ? "px-1" : "px-2")}>
        {filteredItems.map((item) =>
          item.items && !collapsed ? (
            <CollapsibleGroup
              key={item.title}
              item={item}
              isOpen={openGroup === item.title}
              onToggle={() => handleGroupToggle(item.title)}
              isActive={isActive}
            />
          ) : (
            <SingleNavItem key={item.title} item={item} isActive={isActive} collapsed={collapsed} />
          )
        )}
      </nav>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function SingleNavItem({ item, isActive, collapsed = false }: { item: NavItem; isActive: (url: string) => boolean; collapsed?: boolean }) {
  const url = item.url === "#" ? (item.items?.[0]?.url || "/") : item.url;

  if (collapsed) {
    return (
      <NavLink
        to={url}
        className={cn(
          "flex items-center justify-center h-10 w-10 mx-auto rounded-lg transition-all duration-150",
          "hover:bg-accent/50 hover:text-accent-foreground",
          isActive(url) && "bg-primary text-primary-foreground shadow-sm",
        )}
        title={item.title}
      >
        <item.icon className="size-4.5" />
      </NavLink>
    );
  }

  return (
    <NavLink
      to={url}
      className={cn(
        "flex items-center gap-3 px-3 h-10 rounded-md text-sm transition-all duration-200",
        "hover:bg-accent/50 hover:text-accent-foreground",
        isActive(url) && "bg-primary text-primary-foreground font-medium shadow-sm",
      )}
    >
      <item.icon className={cn("size-4 shrink-0", item.isPro && "text-amber-500")} />
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{item.title}</span>
          {item.isPro && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700">PRO</Badge>}
          {item.isNew && <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-green-100 text-green-700">NEW</Badge>}
        </div>
      </div>
    </NavLink>
  );
}

function CollapsibleGroup({
  item, isOpen, onToggle, isActive,
}: {
  item: NavItem;
  isOpen: boolean;
  onToggle: () => void;
  isActive: (url: string) => boolean;
}) {
  const hasActiveChild = item.items?.some((sub) => isActive(sub.url));

  return (
    <div>
      {/* Group trigger */}
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-3 px-3 h-10 w-full rounded-md text-sm transition-all duration-200",
          "hover:bg-accent/50 hover:text-accent-foreground",
          hasActiveChild && "bg-primary/10 text-primary font-medium border-l-2 border-primary",
          isOpen && "bg-accent/30",
        )}
      >
        <item.icon className={cn("size-4 shrink-0", item.isPro && "text-amber-500")} />
        <div className="flex flex-col flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{item.title}</span>
            {item.isPro && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700">PRO</Badge>}
            {item.isNew && <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-green-100 text-green-700">NEW</Badge>}
          </div>
          {item.description && <span className="text-xs text-muted-foreground truncate">{item.description}</span>}
        </div>
        <ChevronRight className={cn("size-4 shrink-0 transition-transform duration-200", isOpen && "rotate-90")} />
      </button>

      {/* Sub-items */}
      {isOpen && item.items && (
        <div className="ml-4 border-l border-border/50 pl-4 mt-1 space-y-0.5">
          {item.items.map((sub) => (
            <NavLink
              key={sub.title}
              to={sub.url}
              className={cn(
                "flex items-center gap-3 px-3 h-9 rounded-md text-sm transition-all duration-200",
                "hover:bg-accent/50 hover:text-accent-foreground",
                isActive(sub.url) && "bg-primary/10 text-primary font-medium border-l-2 border-primary ml-[-1px]",
              )}
            >
              <sub.icon className="size-3.5 shrink-0" />
              <span className="truncate">{sub.title}</span>
              {sub.isNew && <Badge variant="default" className="text-[10px] px-1 py-0 h-3.5 bg-green-100 text-green-700 ml-auto">NEW</Badge>}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}
