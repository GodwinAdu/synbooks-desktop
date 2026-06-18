/**
 * Procurement - Goods Receiving Tab
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, PackageCheck, Trash2, MoreHorizontal, Check } from "lucide-react";
import { toast } from "sonner";
import type { GoodsReceived } from "../types";
import { GRN_STATUS_COLORS } from "../types";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export function GoodsReceivingTab() {
  const [grns, setGrns] = useState<GoodsReceived[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetchGRNs = () => {
    setLoading(true);
    api.get("/procurement/goods-received", { pageSize: 200 })
      .then((res: any) => setGrns(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchGRNs(); }, []);

  const handleAccept = async (id: string) => {
    try { const res: any = await api.post(`/procurement/goods-received/${id}/accept`, {}); toast.success(res.message || "GRN accepted — stock updated"); fetchGRNs(); } catch (e: any) { toast.error(e.message || "Failed"); }
  };

  const filtered = grns.filter((g) =>
    g.grnNumber.toLowerCase().includes(search.toLowerCase()) ||
    (g.vendorName && g.vendorName.toLowerCase().includes(search.toLowerCase())) ||
    (g.poNumber && g.poNumber.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Search / Create */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search GRNs..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => setShowCreate(true)} className="ml-auto">
          <Plus className="h-4 w-4 mr-2" /> Record Receipt
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <PackageCheck className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">No goods receipts found</p>
          <p className="text-sm">Record goods received against purchase orders.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-semibold">GRN #</th>
                    <th className="text-left py-3 px-4 font-semibold">PO #</th>
                    <th className="text-left py-3 px-4 font-semibold">Vendor</th>
                    <th className="text-left py-3 px-4 font-semibold">Received Date</th>
                    <th className="text-right py-3 px-4 font-semibold">Items</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-right py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((grn) => (
                    <tr key={grn.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 font-medium">{grn.grnNumber}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{grn.poNumber || "—"}</td>
                      <td className="py-2.5 px-4">{grn.vendorName || "—"}</td>
                      <td className="py-2.5 px-4 text-muted-foreground text-xs">
                        {grn.receivedDate ? new Date(grn.receivedDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums">{grn.items?.length || 0}</td>
                      <td className="py-2.5 px-4">
                        <Badge className={`text-xs ${GRN_STATUS_COLORS[grn.status] || ""}`}>
                          {grn.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {(grn.status === "pending_inspection" || grn.status === "draft") && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem className="text-emerald-600" onClick={() => handleAccept(grn.id)}>
                                <Check className="h-4 w-4 mr-2" /> Accept & Update Stock
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <CreateGRNDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchGRNs} />
    </div>
  );
}

function CreateGRNDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    poNumber: "",
    vendorName: "",
    receivedDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [items, setItems] = useState<Array<{
    productName: string; orderedQuantity: string; receivedQuantity: string; acceptedQuantity: string; unit: string;
  }>>([]);

  const addItem = () => {
    setItems([...items, { productName: "", orderedQuantity: "", receivedQuantity: "", acceptedQuantity: "", unit: "pcs" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: string) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    setSaving(true);
    try {
      await api.post("/procurement/goods-received", {
        ...form,
        items: items.map((item) => ({
          productName: item.productName,
          orderedQuantity: parseFloat(item.orderedQuantity) || 0,
          receivedQuantity: parseFloat(item.receivedQuantity) || 0,
          acceptedQuantity: parseFloat(item.acceptedQuantity) || 0,
          rejectedQuantity: (parseFloat(item.receivedQuantity) || 0) - (parseFloat(item.acceptedQuantity) || 0),
          unit: item.unit,
        })),
      });
      toast.success("Goods receipt recorded");
      setForm({ poNumber: "", vendorName: "", receivedDate: new Date().toISOString().split("T")[0], notes: "" });
      setItems([]);
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to record goods receipt");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Record Goods Receipt</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>PO Reference</Label>
              <Input value={form.poNumber} onChange={(e) => setForm({ ...form, poNumber: e.target.value })} placeholder="PO-001" />
            </div>
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Input value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} placeholder="Vendor name" />
            </div>
            <div className="space-y-2">
              <Label>Received Date</Label>
              <Input type="date" value={form.receivedDate} onChange={(e) => setForm({ ...form, receivedDate: e.target.value })} />
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No items added yet. Click "Add Item" to begin.</p>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end border p-3 rounded-md">
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Product</Label>
                      <Input value={item.productName} onChange={(e) => updateItem(idx, "productName", e.target.value)} placeholder="Product" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Ordered Qty</Label>
                      <Input type="number" step="0.01" value={item.orderedQuantity} onChange={(e) => updateItem(idx, "orderedQuantity", e.target.value)} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Received Qty</Label>
                      <Input type="number" step="0.01" value={item.receivedQuantity} onChange={(e) => updateItem(idx, "receivedQuantity", e.target.value)} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Accepted Qty</Label>
                      <Input type="number" step="0.01" value={item.acceptedQuantity} onChange={(e) => updateItem(idx, "acceptedQuantity", e.target.value)} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Unit</Label>
                      <Input value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Recording..." : "Record Receipt"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
