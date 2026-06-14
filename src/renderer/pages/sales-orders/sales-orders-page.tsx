/**
 * Sales Orders Page - Main container
 * Manage customer orders before invoicing.
 */

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ShoppingBag, CheckCircle, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { SalesOrderTable } from "./components/sales-order-table";
import { SalesOrderCreateForm } from "./components/sales-order-create-form";
import type { SalesOrder } from "./types";

export function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create">("list");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get("/sales-orders", { pageSize: 100 }).catch(() => ({ data: [] }));
      setOrders(result.data || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  if (view === "create") {
    return <SalesOrderCreateForm onBack={() => { setView("list"); loadOrders(); }} />;
  }

  const totalOrders = orders.length;
  const confirmed = orders.filter(o => o.status === "confirmed").length;
  const fulfilled = orders.filter(o => o.status === "fulfilled").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Heading title="Sales Orders" description="Manage customer orders before invoicing" />
        <Button onClick={() => setView("create")}>
          <Plus className="h-4 w-4 mr-2" />
          New Order
        </Button>
      </div>
      <Separator />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{confirmed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fulfilled</CardTitle>
            <PackageCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{fulfilled}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <SalesOrderTable
        orders={orders}
        loading={loading}
        onRefresh={loadOrders}
      />
    </div>
  );
}
