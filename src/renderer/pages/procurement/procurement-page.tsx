/**
 * Procurement Module Page
 * Tabbed: Requisitions, Goods Receiving
 * (Purchase Orders are already in the Expenses module)
 */

import { useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequisitionsTab } from "./components/requisitions-tab";
import { GoodsReceivingTab } from "./components/goods-receiving-tab";

export function ProcurementPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab = location.pathname.includes("/procurement/goods-receiving")
    ? "goods-receiving"
    : "requisitions";

  return (
    <div className="p-6 space-y-6">
      <Heading title="Procurement" description="Purchase requisitions and goods receiving" />
      <Separator />

      <Tabs value={currentTab} onValueChange={(v) => navigate(v === "requisitions" ? "/procurement" : `/procurement/${v}`)}>
        <TabsList>
          <TabsTrigger value="requisitions">Requisitions</TabsTrigger>
          <TabsTrigger value="goods-receiving">Goods Receiving</TabsTrigger>
        </TabsList>
      </Tabs>

      <Routes>
        <Route index element={<RequisitionsTab />} />
        <Route path="goods-receiving" element={<GoodsReceivingTab />} />
      </Routes>
    </div>
  );
}
