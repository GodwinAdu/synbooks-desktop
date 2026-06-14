import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Package, AlertTriangle, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { InventoryTable } from "./components/inventory-table";
import { type InventoryProduct } from "./components/inventory-columns";

export function InventoryPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/products", { pageSize: 200 })
      .then((res: any) => {
        const all = res.data || [];
        // Only show products where inventory is tracked
        const tracked = all.filter((p: any) => p.trackInventory);
        setProducts(
          tracked.map((p: any) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            currentStock: p.currentStock ?? p.stock ?? 0,
            reorderLevel: p.reorderLevel ?? 0,
            unit: p.unit || "pcs",
            costPrice: p.costPrice ?? 0,
          }))
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalProducts = products.length;
  const lowStock = products.filter(p => p.currentStock <= p.reorderLevel).length;
  const totalValue = products.reduce((sum, p) => sum + p.currentStock * p.costPrice, 0);

  return (
    <div className="p-6 space-y-6">
      <Heading title="Inventory" description="View stock levels across all products" />
      <Separator />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-red-600">{lowStock}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Stock Value</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <InventoryTable products={products} loading={loading} />
    </div>
  );
}
