/**
 * Top Navbar
 * Matches the Next.js app's sticky header with sidebar trigger,
 * breadcrumb, search, theme toggle, and user dropdown.
 */

import { useLocation } from "react-router-dom";
import { useSidebarStore } from "@/components/sidebar/sidebar-store";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  PanelLeft,
  Moon,
  Sun,
  Search,
  Settings,
  LogOut,
  User,
  Shield,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CommandSearch } from "./command-search";

// Route → human-readable breadcrumb
const BREADCRUMBS: Record<string, string> = {
  "/": "Dashboard",
  "/accounts": "Chart of Accounts",
  "/journal-entries": "Journal Entries",
  "/general-ledger": "General Ledger",
  "/period-close": "Period Close",
  "/recurring-journals": "Recurring Journals",
  "/year-end-close": "Year-End Close",
  "/banking": "Banking",
  "/invoices": "Invoices",
  "/customers": "Customers",
  "/estimates": "Estimates",
  "/payments": "Payments",
  "/credit-notes": "Credit Notes",
  "/sales-orders": "Sales Orders",
  "/recurring-invoices": "Recurring Invoices",
  "/expenses": "Expenses",
  "/bills": "Bills",
  "/vendors": "Vendors",
  "/purchase-orders": "Purchase Orders",
  "/recurring-expenses": "Recurring Expenses",
  "/expense-categories": "Expense Categories",
  "/products": "Products & Services",
  "/product-categories": "Product Categories",
  "/inventory": "Inventory",
  "/stock-adjustments": "Stock Adjustments",
  "/reorder-alerts": "Reorder Alerts",
  "/employees": "Employees",
  "/payroll": "Payroll",
  "/payroll-history": "Payroll History",
  "/deductions": "Deductions",
  "/time-tracking": "Time Tracking",
  "/leave-management": "Leave Management",
  "/reports": "Reports",
  "/projects": "Projects",
  "/budgets": "Budgets",
  "/assets": "Fixed Assets",
  "/crm": "CRM",
  "/pos": "Point of Sale",
  "/production": "Production",
  "/procurement": "Procurement",
  "/contracts": "Contracts",
  "/settings": "Settings",
  "/profile": "My Profile",
};

function getBreadcrumb(pathname: string): { module: string; page: string } {
  // Direct match
  if (BREADCRUMBS[pathname]) {
    return { module: "", page: BREADCRUMBS[pathname] };
  }
  // Find closest parent
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length > 0) {
    const parent = "/" + parts[0];
    return {
      module: BREADCRUMBS[parent] || "",
      page: parts.slice(1).join(" / ") || BREADCRUMBS[parent] || "Dashboard",
    };
  }
  return { module: "", page: "Dashboard" };
}

export function Navbar() {
  const { toggle } = useSidebarStore();
  const { user, organization, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [showSearch, setShowSearch] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Global Ctrl+K shortcut to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const breadcrumb = getBreadcrumb(location.pathname);
  const isAdmin = user?.role === "admin";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <>
      <header className="flex w-full sticky top-0 z-50 bg-background h-12 border-b shrink-0 items-center gap-2 shadow-sm transition-[width,height] ease-linear">
        {/* Left: Sidebar trigger + breadcrumb */}
        <div className="flex items-center gap-2 pl-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={toggle}
            title="Toggle sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1.5 text-sm">
            {breadcrumb.module && (
              <>
                <span className="text-muted-foreground text-xs hidden sm:inline">
                  {breadcrumb.module}
                </span>
                <span className="text-muted-foreground text-xs hidden sm:inline">/</span>
              </>
            )}
            <span className="font-medium truncate max-w-[200px]">
              {breadcrumb.page}
            </span>
          </div>
        </div>

        {/* Right: Search, fullscreen, theme, user */}
        <div className="flex items-center gap-1 ml-auto pr-3">
          {/* Search */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 text-muted-foreground hover:text-foreground hidden sm:flex"
            onClick={() => setShowSearch(true)}
          >
            <Search className="h-4 w-4" />
            <span className="text-xs">Search...</span>
            <kbd className="pointer-events-none hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              Ctrl+K
            </kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:hidden text-muted-foreground"
            onClick={() => setShowSearch(true)}
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hidden sm:flex"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={toggleTheme}
            title="Toggle theme"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 focus:outline-none rounded-full">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white text-xs font-bold border-2 border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
                  {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 shadow-xl rounded-lg p-2" align="end">
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-3 px-3 py-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-semibold text-sm truncate">
                      {user?.fullName || "User"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user?.email || ""}
                    </span>
                    {organization?.name && (
                      <span className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {organization.name}
                      </span>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => navigate("/profile")}
                >
                  <User className="h-4 w-4 mr-2" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => navigate("/settings")}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    <span>Company Settings</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>

              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => navigate("/settings")}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      <span>Users & Roles</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span>Log Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Command Search Dialog */}
      {showSearch && <CommandSearch open={showSearch} onClose={() => setShowSearch(false)} />}
    </>
  );
}
