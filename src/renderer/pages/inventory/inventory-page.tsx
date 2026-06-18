/**
 * Inventory Page — Stock Level Management
 * Matches the Next.js app design: summary cards, stock alerts,
 * inventory guide, action buttons, and professional table with stock badges.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { DataTable } from "@/components/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  Bell,
  Download,
  PackageSearch,
  MoreHorizontal,
  PackagePlus,
  ShoppingCart,
  Warehouse,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface InventoryProduct {
  id: string;
  sku?: string;
  name: string;
  category?: string;
  currentStock: number;
  reorderLevel: number;
  unit: string;
  costPrice: number;
  sellingPrice: number;
}

type StockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";

// ─── Stock status helpers ────────────────────────────────────────────────────

function getStockStatus(product: InventoryProduct): "ok" | "low" | "out" {
  if (product.currentStock <= 0) return "out";
  if (product.currentStock <= product.reorderLevel) return "low";
  return "ok";
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export function InventoryPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Stock adjustment dialog state
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<InventoryProduct | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState<number>(0);
  const [stockReason, setStockReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  // ─── Data loading ────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result: any = await api.get("/products", { pageSize: 500 });
      const all = result.data || [];
      const tracked = all
        .filter((p: any) => p.trackInventory)
        .map((p: any): InventoryProduct => ({
          id: p.id,
          sku: p.sku || undefined,
          name: p.name,
          category: p.category || p.categoryName || undefined,
          currentStock: p.currentStock ?? p.stock ?? 0,
          reorderLevel: p.reorderLevel ?? 0,
          unit: p.unit || "pcs",
          costPrice: p.costPrice ?? 0,
          sellingPrice: p.sellingPrice ?? p.price ?? 0,
        }));
      setProducts(tracked);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── Filtered data ───────────────────────────────────────────────────────

  const filteredProducts = useMemo(() => {
    let result = products;

    if (stockFilter === "in_stock") result = result.filter((p) => getStockStatus(p) === "ok");
    else if (stockFilter === "low_stock") result = result.filter((p) => getStockStatus(p) === "low");
    else if (stockFilter === "out_of_stock") result = result.filter((p) => getStockStatus(p) === "out");

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q))
      );
    }

    return result;
  }, [products, stockFilter, searchQuery]);

  // ─── Summary calculations ────────────────────────────────────────────────

  const summary = useMemo(() => {
    const totalProducts = products.length;
    const totalValue = products.reduce((sum, p) => sum + p.currentStock * p.costPrice, 0);
    const lowStock = products.filter((p) => getStockStatus(p) === "low").length;
    const outOfStock = products.filter((p) => getStockStatus(p) === "out").length;
    return { totalProducts, totalValue, lowStock, outOfStock };
  }, [products]);

  // ─── Stock adjustment handlers ───────────────────────────────────────────

  const handleAdjustStock = (product: InventoryProduct) => {
    setStockProduct(product);
    setStockAdjustment(0);
    setStockReason("");
    setStockDialogOpen(true);
  };

  const submitStockAdjustment = async () => {
    if (!stockProduct || stockAdjustment === 0) {
      toast.error("Please enter a non-zero adjustment amount");
      return;
    }
    setAdjusting(true);
    try {
      const result: any = await api.post(`/products/${stockProduct.id}/adjust-stock`, {
        adjustment: stockAdjustment,
        reason: stockReason || undefined,
      });
      toast.success(
        `Stock adjusted for "${stockProduct.name}". New stock: ${result.newStock ?? (stockProduct.currentStock + stockAdjustment)}`
      );
      setStockDialogOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to adjust stock");
    } finally {
      setAdjusting(false);
    }
  };

  const handleExport = () => {
    try {
      const headers = ["SKU", "Product", "Stock", "Reorder Level", "Cost Price", "Value", "Status"];
      const rows = products.map((p) => {
        const status = getStockStatus(p);
        const labels = { ok: "In Stock", low: "Low Stock", out: "Out of Stock" };
        return [
          p.sku || "",
          p.name,
          p.currentStock.toString(),
          p.reorderLevel.toString(),
          p.costPrice.toString(),
          (p.currentStock * p.costPrice).toString(),
          labels[status],
        ];
      });
      const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventory-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Inventory exported successfully");
    } catch {
      toast.error("Failed to export inventory");
    }
  };

  // ─── Table columns (matching Next.js style with Badges) ──────────────────

  const columns: ColumnDef<InventoryProduct>[] = useMemo(
    () => [
      {
        accessorKey: "sku",
        header: "SKU",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.getValue("sku") || "—"}</span>
        ),
      },
      {
        accessorKey: "name",
        header: "Product",
        cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
      },
      {
        accessorKey: "currentStock",
        header: "Stock",
        cell: ({ row }) => {
          const product = row.original;
          const status = getStockStatus(product);
          return (
            <Badge
              variant={status === "out" ? "destructive" : "default"}
              className={
                status === "ok"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : status === "low"
                  ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                  : ""
              }
            >
              {product.currentStock}
            </Badge>
          );
        },
      },
      {
        accessorKey: "reorderLevel",
        header: "Reorder At",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.getValue("reorderLevel") as number}</span>
        ),
      },
      {
        id: "value",
        header: "Value",
        cell: ({ row }) => {
          const value = row.original.currentStock * row.original.costPrice;
          return <span className="font-medium">{formatCurrency(value)}</span>;
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = getStockStatus(row.original);
          const labels = { ok: "In Stock", low: "Low Stock", out: "Out of Stock" };
          return (
            <Badge
              variant={status === "out" ? "destructive" : "default"}
              className={`text-xs ${
                status === "ok"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : status === "low"
                  ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                  : ""
              }`}
            >
              {labels[status]}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const product = row.original;
          const status = getStockStatus(product);
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleAdjustStock(product)}>
                  <PackagePlus className="h-4 w-4 mr-2" />
                  Adjust Stock
                </DropdownMenuItem>
                {(status === "low" || status === "out") && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => toast.info(`Reorder initiated for "${product.name}" — navigate to Purchase Orders.`)}>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Reorder
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    []
  );

  // ─── Loading skeleton ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-3 sm:p-6 lg:p-8 pt-4 sm:pt-6">
        <Heading title="Inventory Tracking" description="Monitor stock levels and inventory value" />
        <Separator />
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[80px] w-full rounded-lg" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────

  return (
    <div className="flex-1 space-y-4 p-3 sm:p-6 lg:p-8 pt-4 sm:pt-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Heading
          title="Inventory Tracking"
          description="Monitor stock levels and inventory value"
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/reorder-alerts")}>
            <Bell className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Reorder Alerts</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/stock-adjustments")}>
            <PackagePlus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Stock Adjustments</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>
      <Separator />

      {/* Summary Cards — matching Next.js simple style */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-3 sm:p-6">
          <div className="flex flex-col space-y-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Items</p>
            <p className="text-lg sm:text-2xl font-bold">{summary.totalProducts}</p>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3 sm:p-6">
          <div className="flex flex-col space-y-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">Inventory Value</p>
            <p className="text-lg sm:text-2xl font-bold text-emerald-600 truncate">
              {formatCurrency(summary.totalValue)}
            </p>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3 sm:p-6">
          <div className="flex flex-col space-y-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">Low Stock</p>
            <p className="text-lg sm:text-2xl font-bold text-yellow-600">{summary.lowStock}</p>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3 sm:p-6">
          <div className="flex flex-col space-y-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground">Out of Stock</p>
            <p className="text-lg sm:text-2xl font-bold text-red-600">{summary.outOfStock}</p>
          </div>
        </div>
      </div>

      {/* Stock Alerts — yellow warning when items are low/out */}
      {(summary.lowStock > 0 || summary.outOfStock > 0) && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20 p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-medium text-yellow-900 dark:text-yellow-200 text-sm">Stock Alerts</h4>
              <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {summary.lowStock > 0 && `${summary.lowStock} item(s) running low. `}
                {summary.outOfStock > 0 && `${summary.outOfStock} item(s) out of stock.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Tracking Guide — green alert matching Next.js */}
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
        <PackageSearch className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900 dark:text-green-200 font-semibold">Inventory Tracking Guide</AlertTitle>
        <AlertDescription className="text-green-800 dark:text-green-300 mt-2">
          <div className="space-y-2 text-sm">
            <p><span className="font-semibold">Stock levels:</span> Current stock updates automatically when sales orders are fulfilled, purchase orders are received, and stock adjustments are made.</p>
            <p><span className="font-semibold">Reorder levels:</span> Set a minimum stock level per product — when stock falls below this, the item appears in Reorder Alerts.</p>
            <p><span className="font-semibold">Valuation method:</span> Stock is valued using the cost price set on each product. Keep cost prices up to date for accurate inventory valuation reports.</p>
            <p className="text-amber-700 dark:text-amber-400 font-semibold mt-2">⚠️ Conduct a physical stocktake at least quarterly and use Stock Adjustments to correct any discrepancies.</p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as StockFilter)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
        >
          <option value="all">All Stock Status</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
        <p className="text-sm text-muted-foreground ml-auto">
          Showing {filteredProducts.length} of {products.length} products
        </p>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredProducts}
        searchKey="name"
        searchPlaceholder="Search by name, SKU..."
        pageSize={20}
        emptyMessage="No inventory products match your filters."
        emptyIcon={<Warehouse className="size-10 text-muted-foreground/50 mb-2" />}
      />

      {/* Stock Adjustment Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              {stockProduct
                ? `Adjust stock for "${stockProduct.name}" (current: ${stockProduct.currentStock} ${stockProduct.unit})`
                : "Adjust product stock quantity"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Adjustment Amount</Label>
              <Input
                type="number"
                value={stockAdjustment || ""}
                onChange={(e) => setStockAdjustment(parseInt(e.target.value) || 0)}
                placeholder="e.g. 10 to add, -5 to remove"
              />
              <p className="text-xs text-muted-foreground">
                Use positive numbers to add stock, negative to remove.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                value={stockReason}
                onChange={(e) => setStockReason(e.target.value)}
                placeholder="e.g. Received shipment, Damaged goods, Inventory correction..."
                rows={2}
              />
            </div>
            {stockAdjustment !== 0 && stockProduct && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current stock:</span>
                  <span>{stockProduct.currentStock} {stockProduct.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Adjustment:</span>
                  <span className={stockAdjustment > 0 ? "text-emerald-600" : "text-red-600"}>
                    {stockAdjustment > 0 ? "+" : ""}{stockAdjustment}
                  </span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>New stock:</span>
                  <span>{Math.max(0, stockProduct.currentStock + stockAdjustment)} {stockProduct.unit}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStockDialogOpen(false)} disabled={adjusting}>
              Cancel
            </Button>
            <Button onClick={submitStockAdjustment} disabled={adjusting || stockAdjustment === 0}>
              {adjusting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Apply Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
