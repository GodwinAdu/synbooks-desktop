import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/table";
import { type ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, CheckCircle2, Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ReorderProduct {
  id: string;
  sku?: string;
  name: string;
  currentStock: number;
  reorderLevel: number;
  deficit: number;
  unit: string;
}

function getReorderColumns(): ColumnDef<ReorderProduct>[] {
  return [
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("sku") || "—"}</span>,
    },
    {
      accessorKey: "name",
      header: "Product Name",
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "currentStock",
      header: () => <div className="text-right">Current Stock</div>,
      cell: ({ row }) => (
        <div className="text-right font-bold text-red-600">
          {row.getValue("currentStock")}
        </div>
      ),
    },
    {
      accessorKey: "reorderLevel",
      header: () => <div className="text-right">Reorder Level</div>,
      cell: ({ row }) => <div className="text-right">{row.getValue("reorderLevel")}</div>,
    },
    {
      accessorKey: "deficit",
      header: () => <div className="text-right">Deficit</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium text-amber-600">
          {row.getValue("deficit")}
        </div>
      ),
    },
    {
      accessorKey: "unit",
      header: "Unit",
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("unit") || "pcs"}</span>,
    },
  ];
}

export function ReorderAlertsPage() {
  const [products, setProducts] = useState<ReorderProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/products", { pageSize: 200 })
      .then((res: any) => {
        const all = res.data || [];
        const belowReorder = all
          .filter((p: any) => p.trackInventory && (p.currentStock ?? p.stock ?? 0) <= (p.reorderLevel ?? 0))
          .map((p: any) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            currentStock: p.currentStock ?? p.stock ?? 0,
            reorderLevel: p.reorderLevel ?? 0,
            deficit: (p.reorderLevel ?? 0) - (p.currentStock ?? p.stock ?? 0),
            unit: p.unit || "pcs",
          }));
        setProducts(belowReorder);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const columns = getReorderColumns();

  return (
    <div className="p-6 space-y-6">
      <Heading title="Reorder Alerts" description="Products below reorder level" />
      <Separator />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              <div>
                <p className="font-medium text-emerald-700 dark:text-emerald-400">All stock levels are healthy</p>
                <p className="text-sm text-muted-foreground">No products are below their configured reorder level.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Warning Alert */}
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  These products have stock below their configured reorder level. Consider placing purchase orders.
                </p>
              </div>
            </CardContent>
          </Card>

          <DataTable
            columns={columns}
            data={products}
            searchKey="name"
            searchPlaceholder="Search products..."
            pageSize={20}
            emptyMessage="No products below reorder level."
            emptyIcon={<Bell className="size-10 text-muted-foreground/50 mb-2" />}
          />
        </>
      )}
    </div>
  );
}
