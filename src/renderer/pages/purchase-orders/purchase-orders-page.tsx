import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PurchaseOrderTable } from "./components/purchase-order-table";
import { PurchaseOrderCreateForm } from "./components/purchase-order-create-form";
import type { PurchaseOrder } from "./types";

export function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create">("list");

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/purchase-orders", { pageSize: 50 })
      .then((res: any) => setOrders(res.data || []))
      .catch(() => ({ data: [] }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (view === "create") {
    return <PurchaseOrderCreateForm onBack={() => { setView("list"); load(); }} />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Heading title="Purchase Orders" description="Manage purchase orders for vendors" />
        <Button onClick={() => setView("create")}>
          <Plus className="h-4 w-4 mr-2" />
          New Purchase Order
        </Button>
      </div>
      <Separator />
      <PurchaseOrderTable orders={orders} loading={loading} onRefresh={load} />
    </div>
  );
}
