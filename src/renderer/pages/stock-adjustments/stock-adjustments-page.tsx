import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  sku?: string;
  currentStock?: number;
  stock?: number;
}

interface AdjustmentLog {
  id: string;
  productName: string;
  adjustment: number;
  reason: string;
  notes?: string;
  timestamp: string;
}

const reasonOptions = [
  { value: "received", label: "Received" },
  { value: "damaged", label: "Damaged" },
  { value: "returned", label: "Returned" },
  { value: "correction", label: "Correction" },
  { value: "write-off", label: "Write-off" },
];

export function StockAdjustmentsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [adjustments, setAdjustments] = useState<AdjustmentLog[]>([]);

  // Form state
  const [selectedProductId, setSelectedProductId] = useState("");
  const [adjustment, setAdjustment] = useState<number>(0);
  const [reason, setReason] = useState("received");
  const [notes, setNotes] = useState("");

  const loadProducts = useCallback(() => {
    setLoading(true);
    api
      .get("/products", { pageSize: 200 })
      .then((res: any) => {
        const all = res.data || [];
        setProducts(all.filter((p: any) => p.trackInventory));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleSubmit = async () => {
    if (!selectedProductId) {
      toast.error("Please select a product");
      return;
    }
    if (adjustment === 0) {
      toast.error("Adjustment amount cannot be zero");
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/products/${selectedProductId}/adjust-stock`, {
        adjustment,
        reason: `${reason}${notes ? ` - ${notes}` : ""}`,
      });

      const product = products.find(p => p.id === selectedProductId);
      const log: AdjustmentLog = {
        id: Date.now().toString(),
        productName: product?.name || "Unknown",
        adjustment,
        reason,
        notes: notes || undefined,
        timestamp: new Date().toISOString(),
      };
      setAdjustments(prev => [log, ...prev]);

      toast.success("Stock adjusted successfully");
      // Reset form
      setSelectedProductId("");
      setAdjustment(0);
      setReason("received");
      setNotes("");
    } catch (err: any) {
      toast.error(err.message || "Failed to adjust stock");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Heading title="Stock Adjustments" description="Record inventory adjustments" />
      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        {/* Adjustment Form */}
        <Card>
          <CardHeader>
            <CardTitle>New Adjustment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Product *</Label>
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                disabled={loading}
              >
                <option value="">Select a product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.sku ? `(${p.sku})` : ""} — Stock: {p.currentStock ?? p.stock ?? 0}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Adjustment Amount (+/-)</Label>
              <Input
                type="number"
                value={adjustment}
                onChange={e => setAdjustment(parseInt(e.target.value) || 0)}
                placeholder="e.g. 10 or -5"
              />
              <p className="text-xs text-muted-foreground">
                Positive to add stock, negative to remove stock
              </p>
            </div>

            <div className="space-y-2">
              <Label>Reason</Label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                {reasonOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Optional notes about this adjustment..."
                rows={3}
              />
            </div>

            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PackagePlus className="h-4 w-4 mr-2" />}
              Adjust Stock
            </Button>
          </CardContent>
        </Card>

        {/* Recent Adjustments Log */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Adjustments</CardTitle>
          </CardHeader>
          <CardContent>
            {adjustments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No adjustments recorded this session.
              </p>
            ) : (
              <div className="divide-y space-y-0">
                {adjustments.map(log => (
                  <div key={log.id} className="py-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{log.productName}</span>
                      <Badge
                        variant="outline"
                        className={
                          log.adjustment > 0
                            ? "border-emerald-600 text-emerald-600"
                            : "border-red-600 text-red-600"
                        }
                      >
                        {log.adjustment > 0 ? `+${log.adjustment}` : log.adjustment}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{log.reason}</span>
                      <span>•</span>
                      <span>{formatDate(log.timestamp)}</span>
                    </div>
                    {log.notes && (
                      <p className="text-xs text-muted-foreground">{log.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
