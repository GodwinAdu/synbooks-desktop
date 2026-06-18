/**
 * Reorder Alerts Page
 * Matches the Next.js app: summary cards, reorder recommendations list
 * with status badges, suggested quantities, cost estimates, and quick order dialog.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Bell,
  AlertCircle,
  Package,
  ShoppingCart,
  ShoppingBag,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReorderProduct {
  id: string;
  sku: string;
  name: string;
  currentStock: number;
  reorderLevel: number;
  costPrice: number;
  unit: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStockStatus(product: ReorderProduct) {
  if (product.currentStock === 0) return { label: "Out of Stock", variant: "destructive" as const };
  if (product.currentStock < product.reorderLevel * 0.5) return { label: "Critical", variant: "destructive" as const };
  return { label: "Low Stock", variant: "secondary" as const };
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ReorderAlertsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ReorderProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick order dialog state
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderProduct, setOrderProduct] = useState<ReorderProduct | null>(null);
  const [orderQuantity, setOrderQuantity] = useState(0);
  const [orderSubmitting, setOrderSubmitting] = useState(false);

  // ─── Data loading ────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result: any = await api.get("/products", { pageSize: 500 });
      const all = result.data || [];
      const belowReorder = all
        .filter((p: any) => p.trackInventory && (p.currentStock ?? 0) <= (p.reorderLevel ?? 0))
        .map((p: any): ReorderProduct => ({
          id: p.id,
          sku: p.sku || "",
          name: p.name,
          currentStock: p.currentStock ?? 0,
          reorderLevel: p.reorderLevel ?? 0,
          costPrice: p.costPrice ?? 0,
          unit: p.unit || "pcs",
        }));
      setProducts(belowReorder);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load reorder data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── Summary calculations ────────────────────────────────────────────────

  const summary = useMemo(() => {
    const outOfStock = products.filter((p) => p.currentStock === 0);
    const critical = products.filter((p) => p.currentStock > 0 && p.currentStock < p.reorderLevel * 0.5);
    const lowStock = products.filter((p) => p.currentStock > 0 && p.currentStock >= p.reorderLevel * 0.5 && p.currentStock <= p.reorderLevel);
    return {
      totalAlerts: products.length,
      outOfStock: outOfStock.length,
      lowStock: lowStock.length,
      critical: critical.length,
    };
  }, [products]);

  // ─── Quick Order handlers ────────────────────────────────────────────────

  const openQuickOrder = (product: ReorderProduct) => {
    const suggested = product.reorderLevel * 2;
    setOrderProduct(product);
    setOrderQuantity(suggested);
    setOrderDialogOpen(true);
  };

  const submitQuickOrder = async () => {
    if (!orderProduct || orderQuantity <= 0) return;
    setOrderSubmitting(true);
    try {
      await api.post("/procurement/purchase-orders", {
        vendorId: null,
        orderDate: new Date().toISOString().split("T")[0],
        expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        lineItems: JSON.stringify([{
          productId: orderProduct.id,
          description: orderProduct.name,
          quantity: orderQuantity,
          unitPrice: orderProduct.costPrice,
          amount: orderQuantity * orderProduct.costPrice,
        }]),
        subtotal: orderQuantity * orderProduct.costPrice,
        taxAmount: 0,
        totalAmount: orderQuantity * orderProduct.costPrice,
        status: "draft",
        notes: `Auto-generated from reorder alert for ${orderProduct.name}`,
      });
      toast.success("Purchase order created as draft");
      setOrderDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to create purchase order");
    } finally {
      setOrderSubmitting(false);
    }
  };

  // ─── Loading skeleton ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-3 sm:p-6 lg:p-8 pt-4 sm:pt-6">
        <Heading title="Reorder Alerts" description="Automatic alerts for low stock items" />
        <Separator />
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────

  return (
    <div className="flex-1 space-y-4 p-3 sm:p-6 lg:p-8 pt-4 sm:pt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Heading
          title="Reorder Alerts"
          description="Automatic alerts for low stock items"
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/purchase-orders")}>
            <ShoppingBag className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Create PO</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/inventory")}>
            <Package className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Inventory</span>
          </Button>
        </div>
      </div>
      <Separator />

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{summary.totalAlerts}</div>
            <p className="text-xs text-muted-foreground mt-1">Active alerts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-red-600">{summary.outOfStock}</div>
            <p className="text-xs text-muted-foreground mt-1">Urgent action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-orange-600">{summary.lowStock}</div>
            <p className="text-xs text-muted-foreground mt-1">Reorder soon</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Items</CardTitle>
            <ShoppingCart className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-red-600">{summary.critical}</div>
            <p className="text-xs text-muted-foreground mt-1">Below 50% threshold</p>
          </CardContent>
        </Card>
      </div>

      {/* Reorder Recommendations */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-base">Reorder Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-emerald-600 mb-4" />
              <p className="text-muted-foreground font-medium">All products are well stocked</p>
              <p className="text-sm text-muted-foreground mt-2">No reorder alerts at this time</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product) => {
                const status = getStockStatus(product);
                const suggestedOrder = product.reorderLevel * 2;
                const estimatedCost = product.costPrice * suggestedOrder;
                return (
                  <div
                    key={product.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          SKU: {product.sku || "—"} • Current: {product.currentStock} {product.unit} • Reorder Level: {product.reorderLevel}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium">Suggested: {suggestedOrder} {product.unit}</p>
                        <p className="text-xs text-muted-foreground">Est. Cost: {formatCurrency(estimatedCost)}</p>
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <Button size="sm" variant="outline" onClick={() => openQuickOrder(product)}>
                        Order
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Order Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Order - {orderProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Input value={orderProduct?.name || ""} disabled />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(parseInt(e.target.value) || 0)}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Price</Label>
                <Input value={formatCurrency(orderProduct?.costPrice || 0)} disabled />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Total Amount</Label>
              <Input
                value={formatCurrency(orderQuantity * (orderProduct?.costPrice || 0))}
                disabled
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={submitQuickOrder}
              disabled={orderSubmitting || orderQuantity < 1}
            >
              {orderSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {orderSubmitting ? "Creating..." : "Create PO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
