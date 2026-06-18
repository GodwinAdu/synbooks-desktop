/**
 * Product Detail View
 * Shows full product information in a read-only layout with info cards,
 * pricing, inventory, variants, and suppliers.
 * Includes Deactivate/Activate toggle and stock adjustment.
 */

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Edit,
  Package,
  Tag,
  Barcode,
  Layers,
  Ruler,
  Star,
  Power,
  PackagePlus,
  Loader2,
} from "lucide-react";

interface Props {
  product: any;
  onBack: () => void;
  onEdit: () => void;
  onRefresh?: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "border-emerald-600 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" },
  inactive: { label: "Inactive", className: "border-gray-400 text-gray-500 bg-gray-50 dark:bg-gray-900/20" },
  discontinued: { label: "Discontinued", className: "border-red-600 text-red-600 bg-red-50 dark:bg-red-900/20" },
};

const typeLabels: Record<string, string> = {
  product: "Product",
  service: "Service",
  bundle: "Bundle",
  raw_material: "Raw Material",
  finished_good: "Finished Good",
};

export function ProductDetail({ product, onBack, onEdit, onRefresh }: Props) {
  const status = statusConfig[product.status || "active"] || statusConfig.active;
  const isActive = (product.status || "active") === "active";

  // Stock adjustment dialog
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockAdjustment, setStockAdjustment] = useState<number>(0);
  const [stockReason, setStockReason] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const margin = useMemo(() => {
    const selling = product.sellingPrice || product.price || 0;
    const cost = product.costPrice || 0;
    if (selling > 0) {
      return (((selling - cost) / selling) * 100).toFixed(1);
    }
    return "0.0";
  }, [product]);

  const sellingPrice = product.sellingPrice || product.price || 0;
  const currentStock = product.currentStock ?? product.stock ?? 0;
  const isLowStock =
    product.trackInventory !== false &&
    product.currentStock != null &&
    product.reorderLevel != null &&
    product.currentStock <= product.reorderLevel;

  const handleToggleStatus = async () => {
    const newStatus = isActive ? "inactive" : "active";
    setToggling(true);
    try {
      await api.put(`/products/${product.id}`, { status: newStatus });
      toast.success(`Product ${newStatus === "active" ? "activated" : "deactivated"}`);
      onBack();
    } catch (e: any) {
      toast.error(e.message || "Failed to update status");
    } finally {
      setToggling(false);
    }
  };

  const submitStockAdjustment = async () => {
    if (stockAdjustment === 0) {
      toast.error("Please enter a non-zero adjustment amount");
      return;
    }
    setAdjusting(true);
    try {
      const result: any = await api.post(`/products/${product.id}/adjust-stock`, {
        adjustment: stockAdjustment,
        reason: stockReason || undefined,
      });
      toast.success(`Stock adjusted. New stock: ${result.newStock ?? "updated"}`);
      setStockDialogOpen(false);
      onBack();
    } catch (e: any) {
      toast.error(e.message || "Failed to adjust stock");
    } finally {
      setAdjusting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setStockAdjustment(0);
              setStockReason("");
              setStockDialogOpen(true);
            }}
          >
            <PackagePlus className="h-4 w-4 mr-2" /> Adjust Stock
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleStatus}
            disabled={toggling}
          >
            {toggling ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Power className="h-4 w-4 mr-2" />
            )}
            {isActive ? "Deactivate" : "Activate"}
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
        </div>
      </div>
      <Separator />

      {/* Info Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <InfoCard icon={<Layers className="h-4 w-4 text-blue-500" />} label="Type" value={typeLabels[product.type] || product.type || "Product"} />
        <InfoCard icon={<Tag className="h-4 w-4 text-purple-500" />} label="SKU" value={product.sku || "—"} mono />
        <InfoCard icon={<Barcode className="h-4 w-4 text-gray-500" />} label="Barcode" value={product.barcode || "—"} mono />
        <InfoCard icon={<Package className="h-4 w-4 text-amber-500" />} label="Category" value={product.category || product.categoryName || "—"} />
        <InfoCard icon={<Ruler className="h-4 w-4 text-green-500" />} label="Unit" value={product.unit || "pcs"} />
      </div>

      {/* Description */}
      {product.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{product.description}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pricing Card */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Cost Price</p>
                <p className="text-lg font-semibold">{formatCurrency(product.costPrice || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Selling Price</p>
                <p className="text-lg font-semibold">{formatCurrency(sellingPrice)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Margin</p>
                <p className="text-lg font-semibold text-emerald-600">{margin}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tax Rate</p>
                <p className="text-lg font-semibold">
                  {product.taxable ? `${product.taxRate || 0}%` : "Not taxable"}
                </p>
              </div>
            </div>

            {/* Price Tiers */}
            {product.priceTiers && product.priceTiers.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Price Tiers</p>
                <div className="space-y-1">
                  {product.priceTiers.map((tier: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{tier.tierName} (min {tier.minQuantity})</span>
                      <span className="font-medium">{formatCurrency(tier.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inventory Card */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            {product.trackInventory === false ? (
              <p className="text-sm text-muted-foreground">Inventory tracking is disabled for this item.</p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Current Stock</p>
                  <p className={`text-2xl font-bold ${isLowStock ? "text-red-600" : "text-emerald-600"}`}>
                    {currentStock}
                  </p>
                  {isLowStock && (
                    <p className="text-xs text-red-500 mt-1">Below reorder level</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reorder Level</p>
                  <p className="text-lg font-semibold">{product.reorderLevel ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reorder Qty</p>
                  <p className="text-lg font-semibold">{product.reorderQuantity ?? "—"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details Section */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium">{typeLabels[product.type] || product.type || "Product"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Category</p>
              <p className="font-medium">{product.category || product.categoryName || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Unit</p>
              <p className="font-medium">{product.unit || "pcs"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Barcode</p>
              <p className="font-medium font-mono">{product.barcode || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Taxable</p>
              <p className="font-medium">{product.taxable ? "Yes" : "No"}</p>
            </div>
            {product.taxable && (
              <div>
                <p className="text-muted-foreground">Tax Rate</p>
                <p className="font-medium">{product.taxRate || 0}%</p>
              </div>
            )}
            {product.type === "service" && product.serviceType && (
              <div>
                <p className="text-muted-foreground">Service Type</p>
                <p className="font-medium capitalize">{product.serviceType.replace(/_/g, " ")}</p>
              </div>
            )}
            {product.type === "service" && product.duration && (
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="font-medium">{product.duration}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Variants Table */}
      {product.hasVariants && product.variants && product.variants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Variants ({product.variants.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Name</th>
                    <th className="text-left py-2 font-medium">SKU</th>
                    <th className="text-left py-2 font-medium">Attributes</th>
                    <th className="text-right py-2 font-medium">Price</th>
                    <th className="text-right py-2 font-medium">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants.map((v: any, idx: number) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-2">{v.name || "—"}</td>
                      <td className="py-2 font-mono text-xs">{v.sku || "—"}</td>
                      <td className="py-2 text-muted-foreground">{v.attributes || "—"}</td>
                      <td className="py-2 text-right">{formatCurrency(v.sellingPrice || 0)}</td>
                      <td className="py-2 text-right">{v.stock ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suppliers Table */}
      {product.suppliers && product.suppliers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Suppliers ({product.suppliers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Vendor</th>
                    <th className="text-left py-2 font-medium">Supplier SKU</th>
                    <th className="text-right py-2 font-medium">Cost</th>
                    <th className="text-right py-2 font-medium">Lead Time</th>
                    <th className="text-center py-2 font-medium">Preferred</th>
                  </tr>
                </thead>
                <tbody>
                  {product.suppliers.map((s: any, idx: number) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-2">{s.vendorName || s.vendorId || "—"}</td>
                      <td className="py-2 font-mono text-xs">{s.supplierSku || "—"}</td>
                      <td className="py-2 text-right">{formatCurrency(s.costPrice || 0)}</td>
                      <td className="py-2 text-right">{s.leadTime ? `${s.leadTime} days` : "—"}</td>
                      <td className="py-2 text-center">
                        {s.isPreferred && (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            <Star className="h-3 w-3 mr-0.5 fill-amber-500" /> Preferred
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bundle Items */}
      {product.type === "bundle" && product.bundleItems && product.bundleItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bundle Items ({product.bundleItems.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {product.bundleItems.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span>{item.productName || item.productId}</span>
                  <span className="text-muted-foreground">× {item.quantity}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stock Adjustment Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              Adjust stock for &ldquo;{product.name}&rdquo; (current: {currentStock})
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
                placeholder="e.g. Received shipment, Damaged goods..."
                rows={2}
              />
            </div>
            {stockAdjustment !== 0 && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <span className="text-muted-foreground">New stock will be: </span>
                <span className="font-semibold">
                  {Math.max(0, currentStock + stockAdjustment)}
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
    </div>
  );
}

// --- Sub-component ---
function InfoCard({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className={`text-sm font-medium truncate ${mono ? "font-mono" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
