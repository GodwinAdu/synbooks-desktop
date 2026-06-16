/**
 * App Sidebar
 * Collapsible sidebar with smooth transition.
 * Collapsed: shows only icons (w-16)
 * Expanded: full navigation with text (w-64)
 */

import { SidebarNav } from "./sidebar-nav";
import { SidebarUserMenu } from "./sidebar-user-menu";
import { SidebarSyncStatus } from "./sidebar-sync-status";
import { useSidebarStore } from "./sidebar-store";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const { collapsed } = useSidebarStore();

  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col h-screen shrink-0 transition-all duration-200 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header / Brand */}
      <div className="h-12 flex items-center px-3 border-b border-sidebar-border shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground text-xs font-bold">S</span>
            </div>
            <div className="overflow-hidden">
              <h1 className="font-bold text-sm leading-tight truncate">SyncBooks</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">Desktop</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="size-7 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <span className="text-primary-foreground text-xs font-bold">S</span>
          </div>
        )}
      </div>

      {/* Navigation (scrollable) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
        <SidebarNav collapsed={collapsed} />
      </div>

      {/* Footer: Sync + User */}
      <div className="shrink-0 border-t border-sidebar-border">
        {!collapsed && <SidebarSyncStatus />}
        <SidebarUserMenu collapsed={collapsed} />
      </div>
    </aside>
  );
}
