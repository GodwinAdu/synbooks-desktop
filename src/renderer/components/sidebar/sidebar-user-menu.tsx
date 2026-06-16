/**
 * Sidebar User Menu
 * Shows compact user info at the bottom of the sidebar.
 * Theme toggle and logout are now in the navbar user dropdown.
 */

import { useAuth } from "@/contexts/auth-context";

export function SidebarUserMenu({ collapsed = false }: { collapsed?: boolean }) {
  const { user, organization } = useAuth();

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-2">
        <div className="size-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-xs font-semibold text-white" title={user?.fullName || "User"}>
          {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      {/* Avatar */}
      <div className="size-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-xs font-semibold text-white shrink-0">
        {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{user?.fullName}</p>
        <p className="text-xs text-muted-foreground truncate">{organization?.name}</p>
      </div>
    </div>
  );
}
