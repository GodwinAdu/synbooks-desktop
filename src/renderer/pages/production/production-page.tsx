/**
 * Production Module Page
 * Tabbed: Work Orders, Bill of Materials, Work Centers
 */

import { useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkOrdersTab } from "./components/work-orders-tab";
import { BOMTab } from "./components/bom-tab";
import { WorkCentersTab } from "./components/work-centers-tab";

export function ProductionPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab = location.pathname.includes("/production/bom")
    ? "bom"
    : location.pathname.includes("/production/work-centers")
      ? "work-centers"
      : "work-orders";

  return (
    <div className="p-6 space-y-6">
      <Heading title="Production" description="Manufacturing — work orders, BOMs, and work centers" />
      <Separator />

      <Tabs value={currentTab} onValueChange={(v) => navigate(v === "work-orders" ? "/production" : `/production/${v}`)}>
        <TabsList>
          <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
          <TabsTrigger value="bom">Bill of Materials</TabsTrigger>
          <TabsTrigger value="work-centers">Work Centers</TabsTrigger>
        </TabsList>
      </Tabs>

      <Routes>
        <Route index element={<WorkOrdersTab />} />
        <Route path="bom" element={<BOMTab />} />
        <Route path="work-centers" element={<WorkCentersTab />} />
      </Routes>
    </div>
  );
}
