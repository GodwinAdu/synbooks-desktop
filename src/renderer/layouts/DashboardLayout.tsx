/**
 * Dashboard Layout
 * Main app shell with sidebar + content area.
 */

import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { PlanBanner } from "@/components/commons/plan-banner";
import { UpdateBanner } from "@/components/commons/update-banner";

export function DashboardLayout() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <UpdateBanner />
        <PlanBanner />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
