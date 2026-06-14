/**
 * Sidebar User Menu
 * Shows user info and logout at the bottom of the sidebar.
 * Supports collapsed mode (icon only).
 */

import { LogOut, Moon, Sun } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function SidebarUserMenu({ collapsed = false }: { collapsed?: boolean }) {
  const { user, organization, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 py-2">
        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary" title={user?.fullName || "User"}>
          {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleTheme} title="Toggle theme">
          {resolvedTheme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={handleLogout} title="Logout">
          <LogOut className="size-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      {/* Avatar */}
      <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
        {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{user?.fullName}</p>
        <p className="text-xs text-muted-foreground truncate">{organization?.name}</p>
      </div>

      {/* Actions */}
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleTheme} title="Toggle theme">
        {resolvedTheme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={handleLogout} title="Logout">
        <LogOut className="size-3.5" />
      </Button>
    </div>
  );
}
