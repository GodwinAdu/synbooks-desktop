/**
 * Stock Adjustments Page
 * Matches the Next.js design: header with action buttons,
 * guide alert, table of all adjustments, and a dialog for new adjustments.
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeftRight,
  Warehouse,
  Plus,
  BarChart3,
  PackagePlus,
  Loader2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  type: "increase" | "decrease";
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  currentStock: number;
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export function StockAdjustmentsPage() {
  const navigate = useNavigate();
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedProductId, setSelectedProductId] = useState("");
  const [type, setType] = useState<"increase" | "decrease">("increase");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  // ─── Data loading ────────────────────────────────────────────────────────

  const loadAdjustments = useCallback(async () => {
    setLoading(true);
    try {
      const result: any = await api.get("/stock-adjustments");
      setAdjustments(Array.isArray(result) ? result : []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load stock adjustments");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const result: any = await api.get("/products", { pageSize: 500 });
      const all = result.data || [];
      setProducts(
        all
          .filter((p: any) => p.trackInventory)
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku || "",
            currentStock: p.currentStock ?? 0,
          }))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => { loadAdjustments(); }, [loadAdjustments]);

  // ─── Dialog handlers ─────────────────────────────────────────────────────

  const openDialog = () => {
    setSelectedProductId("");
    setType("increase");
    setQuantity("");
    setReason("");
    setNotes("");
    setDialogOpen(true);
    loadProducts();
  };

  const handleSubmit = async () => {
    if (!selectedProductId) { toast.error("Please select a product"); return; }
    if (!quantity || parseInt(quantity) <= 0) { toast.error("Quantity must be a positive number"); return; }
    if (!reason.trim()) { toast.error("Reason is required"); return; }

    setSubmitting(true);
    try {
      await api.post("/stock-adjustments", {
        productId: selectedProductId,
        type,
        quantity: parseInt(quantity),
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });
      toast.success("Stock adjustment created successfully");
      setDialogOpen(false);
      loadAdjustments();
    } catch (e: any) {
      toast.error(e.message || "Failed to create adjustment");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Table columns (matching Next.js) ────────────────────────────────────

  const columns: ColumnDef<StockAdjustment>[] = useMemo(
    () => [
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => formatDate(row.getValue("createdAt")),
      },
      {
        id: "product",
        header: "Product",
        cell: ({ row }) => {
          const adj = row.original;
          return (
            <span className="font-medium">
              {adj.productName}
              {adj.productSku ? ` (${adj.productSku})` : ""}
            </span>
          );
        },
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => {
          const type = row.getValue("type") as string;
          return (
            <Badge
              variant={type === "increase" ? "default" : "destructive"}
              className={type === "increase" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              {type === "increase" ? (
                <><ArrowUp className="h-3 w-3 mr-1" />Increase</>
              ) : (
                <><ArrowDown className="h-3 w-3 mr-1" />Decrease</>
              )}
            </Badge>
          );
        },
      },
      {
        accessorKey: "quantity",
        header: "Quantity",
        cell: ({ row }) => {
          const type = row.original.type;
          const qty = row.getValue("quantity") as number;
          return (
            <span className={`font-medium ${type === "increase" ? "text-emerald-600" : "text-red-600"}`}>
              {type === "increase" ? "+" : "-"}{qty}
            </span>
          );
        },
      },
      {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.getValue("reason")}</span>
        ),
      },
      {
        id: "adjustedBy",
        header: "Adjusted By",
        cell: ({ row }) => row.original.createdByName || "—",
      },
    ],
    []
  );

  // ─── Loading skeleton ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-3 sm:p-6 lg:p-8 pt-4 sm:pt-6">
        <Heading title="Stock Adjustments" description="Record inventory adjustments and corrections" />
        <Separator />
        <Skeleton className="h-[120px] w-full rounded-lg" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
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
          title="Stock Adjustments"
          description="Record inventory adjustments and corrections"
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/inventory")}>
            <Warehouse className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Inventory</span>
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={openDialog}
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">New Adjustment</span>
          </Button>
        </div>
      </div>
      <Separator />

      {/* Guide Alert — matching Next.js green alert */}
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
        <BarChart3 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900 dark:text-green-200 font-semibold">Stock Adjustments Guide</AlertTitle>
        <AlertDescription className="text-green-800 dark:text-green-300 mt-2">
          <div className="space-y-2 text-sm">
            <p><span className="font-semibold">When to adjust:</span> Use stock adjustments to correct inventory counts after a physical stocktake, record damaged or expired goods, or account for shrinkage.</p>
            <p><span className="font-semibold">Accounting impact:</span> Every adjustment posts a journal entry to your inventory and cost of goods accounts — always provide a reason for audit purposes.</p>
            <p><span className="font-semibold">Positive vs negative:</span> A positive adjustment increases stock (e.g. found items); a negative adjustment decreases it (e.g. damaged goods written off).</p>
            <p className="text-amber-700 dark:text-amber-400 font-semibold mt-2">⚠️ Frequent large adjustments may indicate a theft or process issue — investigate the root cause.</p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={adjustments}
        searchKey="productName"
        searchPlaceholder="Search by product name..."
        pageSize={20}
        emptyMessage="No stock adjustments recorded yet."
        emptyIcon={<PackagePlus className="size-10 text-muted-foreground/50 mb-2" />}
      />

      {/* New Adjustment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Stock Adjustment</DialogTitle>
            <DialogDescription>Adjust product inventory levels</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Product Selection */}
            <div className="space-y-2">
              <Label>Product *</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingProducts ? "Loading products..." : "Select product"} />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} {product.sku ? `(${product.sku})` : ""} — Stock: {product.currentStock}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type & Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={type} onValueChange={(v) => setType(v as "increase" | "decrease")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">Increase</SelectItem>
                    <SelectItem value="decrease">Decrease</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  min="1"
                />
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for adjustment (e.g. physical stocktake, damaged goods, found items)..."
                rows={3}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>

            {/* Preview */}
            {selectedProductId && quantity && parseInt(quantity) > 0 && (
              <div className="rounded-md bg-muted p-3 text-sm">
                {(() => {
                  const product = products.find((p) => p.id === selectedProductId);
                  if (!product) return null;
                  const adj = type === "increase" ? parseInt(quantity) : -parseInt(quantity);
                  const newStock = Math.max(0, product.currentStock + adj);
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current stock:</span>
                        <span>{product.currentStock}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Adjustment:</span>
                        <span className={type === "increase" ? "text-emerald-600" : "text-red-600"}>
                          {type === "increase" ? "+" : "-"}{quantity}
                        </span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between font-semibold">
                        <span>New stock:</span>
                        <span>{newStock}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
