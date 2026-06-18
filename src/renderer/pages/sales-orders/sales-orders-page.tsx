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
import { Plus, ShoppingBag, CheckCircle, PackageCheck, XCircle, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { SalesOrderTable } from "./components/sales-order-table";
import { SalesOrderCreateForm } from "./components/sales-order-create-form";
import { SalesOrderDetail } from "./components/sales-order-detail";
import type { SalesOrder } from "./types";

export function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedOrderId, setSelectedOrderId] = useState("");

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get("/sales-orders", { pageSize: 100 });
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

  if (view === "detail" && selectedOrderId) {
    return <SalesOrderDetail orderId={selectedOrderId} onBack={() => { setView("list"); loadOrders(); }} />;
  }

  const totalOrders = orders.length;
  const draft = orders.filter(o => o.status === "draft").length;
  const confirmed = orders.filter(o => o.status === "confirmed").length;
  const fulfilled = orders.filter(o => o.status === "fulfilled").length;
  const totalValue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Heading title="Sales Orders" description="Manage customer orders before invoicing" />
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setView("create")}>
          <Plus className="h-4 w-4 mr-2" />
          New Order
        </Button>
      </div>
      <Separator />

      {/* Info */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
        <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Sales orders track what customers have ordered. Confirm them when ready, then convert to invoices for billing. Orders don't affect your accounts until converted.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{draft}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting confirmation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{confirmed}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready to invoice</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fulfilled</CardTitle>
            <PackageCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{fulfilled}</div>
            <p className="text-xs text-muted-foreground mt-1">Invoiced</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <SalesOrderTable
        orders={orders}
        loading={loading}
        onRefresh={loadOrders}
        onView={(o) => { setSelectedOrderId(o.id); setView("detail"); }}
      />
    </div>
  );
}
