/**
 * Product Table
 * Uses the shared DataTable component with TanStack React Table for sorting, search, and pagination.
 * Includes stock adjustment dialog and all actions wired to real API calls.
 */

import { useState } from "react";
import { DataTable } from "@/components/table";
import { Package, Loader2 } from "lucide-react";
import { getProductColumns, type Product } from "./product-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Props {
  products: Product[];
  loading: boolean;
  onRefresh: () => void;
  onView?: (product: Product) => void;
  onEdit?: (product: Product) => void;
}

export function ProductTable({ products, loading, onRefresh, onView, onEdit }: Props) {
  // Stock adjustment dialog state
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState<number>(0);
  const [stockReason, setStockReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const handleAdjustStock = (product: Product) => {
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
        `Stock adjusted. New stock: ${result.newStock ?? "updated"}`
      );
      setStockDialogOpen(false);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to adjust stock");
    } finally {
      setAdjusting(false);
    }
  };

  const handleToggleStatus = async (product: Product) => {
    const currentStatus = product.status || "active";
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await api.put(`/products/${product.id}`, { status: newStatus });
      toast.success(`Product ${newStatus === "active" ? "activated" : "deactivated"}`);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update product status");
    }
  };

  const handleDelete = async (product: Product) => {
    try {
      await api.delete(`/products/${product.id}`);
      toast.success("Product deleted");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete product");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const columns = getProductColumns({
    onView: (product) => onView?.(product),
    onEdit: (product) => onEdit?.(product),
    onAdjustStock: handleAdjustStock,
    onToggleStatus: handleToggleStatus,
    onDelete: handleDelete,
  });

  return (
    <>
      <DataTable
        columns={columns}
        data={products}
        searchKey="name"
        searchPlaceholder="Search products by name..."
        pageSize={20}
        emptyMessage="No products found. Add your first product or service to get started."
        emptyIcon={<Package className="size-10 text-muted-foreground/50 mb-2" />}
      />

      {/* Stock Adjustment Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              {stockProduct
                ? `Adjust stock for "${stockProduct.name}" (current: ${stockProduct.currentStock ?? stockProduct.stock ?? 0})`
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
                <span className="text-muted-foreground">New stock will be: </span>
                <span className="font-semibold">
                  {Math.max(0, (stockProduct.currentStock ?? stockProduct.stock ?? 0) + stockAdjustment)}
                </span>
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
    </>
  );
}
