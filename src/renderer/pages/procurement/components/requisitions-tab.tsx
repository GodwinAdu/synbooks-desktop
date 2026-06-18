/**
 * Procurement - Requisitions Tab
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, FileText, Clock, CheckCircle2, DollarSign, Trash2, MoreHorizontal, Check, X, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import type { Requisition } from "../types";
import { REQ_STATUS_COLORS } from "../types";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

export function RequisitionsTab() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetchRequisitions = () => {
    setLoading(true);
    api.get("/procurement/requisitions", { pageSize: 200 })
      .then((res: any) => setRequisitions(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchRequisitions(); }, []);

  const handleApprove = async (id: string) => {
    try { await api.post(`/procurement/requisitions/${id}/approve`, {}); toast.success("Requisition approved"); fetchRequisitions(); } catch (e: any) { toast.error(e.message || "Failed"); }
  };
  const handleReject = async (id: string) => {
    try { await api.post(`/procurement/requisitions/${id}/reject`, {}); toast.success("Requisition rejected"); fetchRequisitions(); } catch (e: any) { toast.error(e.message || "Failed"); }
  };
  const handleConvertToPO = async (id: string) => {
    try { const res: any = await api.post(`/procurement/requisitions/${id}/convert-to-po`, {}); toast.success(res.message || "Purchase Order created"); fetchRequisitions(); } catch (e: any) { toast.error(e.message || "Failed"); }
  };

  const filtered = requisitions.filter((r) =>
    r.requisitionNumber.toLowerCase().includes(search.toLowerCase()) ||
    (r.requestedBy && r.requestedBy.toLowerCase().includes(search.toLowerCase())) ||
    (r.department && r.department.toLowerCase().includes(search.toLowerCase()))
  );

  const totalReqs = requisitions.length;
  const pendingApproval = requisitions.filter((r) => r.status === "submitted" || r.status === "pending_approval").length;
  const approved = requisitions.filter((r) => r.status === "approved").length;
  const totalValue = requisitions.reduce((s, r) => s + (r.totalAmount || r.totalEstimatedAmount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Requisitions</p>
                <p className="text-2xl font-bold">{totalReqs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold">{pendingApproval}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search / Create */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search requisitions..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => setShowCreate(true)} className="ml-auto">
          <Plus className="h-4 w-4 mr-2" /> New Requisition
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileText className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">No requisitions found</p>
          <p className="text-sm">Create a purchase requisition to request materials or services.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-semibold">Req #</th>
                    <th className="text-left py-3 px-4 font-semibold">Requested By</th>
                    <th className="text-right py-3 px-4 font-semibold">Items</th>
                    <th className="text-right py-3 px-4 font-semibold">Total Amount</th>
                    <th className="text-left py-3 px-4 font-semibold">Priority</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Required Date</th>
                    <th className="text-right py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((req) => (
                    <tr key={req.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 font-medium">{req.requisitionNumber}</td>
                      <td className="py-2.5 px-4">{req.requestedBy}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums">{req.items?.length || 0}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums font-medium">{formatCurrency(req.totalAmount)}</td>
                      <td className="py-2.5 px-4">
                        <Badge className={`text-xs ${PRIORITY_COLORS[req.priority] || ""}`}>
                          {req.priority}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge className={`text-xs ${REQ_STATUS_COLORS[req.status] || ""}`}>
                          {req.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground text-xs">
                        {req.requiredDate ? new Date(req.requiredDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {(req.status === "draft" || req.status === "submitted" || req.status === "pending_approval") && (
                              <DropdownMenuItem className="text-emerald-600" onClick={() => handleApprove(req.id)}>
                                <Check className="h-4 w-4 mr-2" /> Approve
                              </DropdownMenuItem>
                            )}
                            {(req.status === "draft" || req.status === "submitted" || req.status === "pending_approval") && (
                              <DropdownMenuItem className="text-red-600" onClick={() => handleReject(req.id)}>
                                <X className="h-4 w-4 mr-2" /> Reject
                              </DropdownMenuItem>
                            )}
                            {req.status === "approved" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-blue-600" onClick={() => handleConvertToPO(req.id)}>
                                  <ShoppingBag className="h-4 w-4 mr-2" /> Convert to PO
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <CreateRequisitionDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchRequisitions} />
    </div>
  );
}

function CreateRequisitionDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    department: "",
    priority: "normal",
    requiredDate: "",
    notes: "",
  });
  const [items, setItems] = useState<Array<{
    productName: string; quantity: string; unit: string; estimatedCost: string; vendorName: string;
  }>>([]);

  const addItem = () => {
    setItems([...items, { productName: "", quantity: "", unit: "pcs", estimatedCost: "", vendorName: "" }]);
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
      await api.post("/procurement/requisitions", {
        ...form,
        items: items.map((item) => ({
          productName: item.productName,
          quantity: parseFloat(item.quantity) || 0,
          unit: item.unit,
          estimatedCost: parseFloat(item.estimatedCost) || 0,
          vendorName: item.vendorName,
        })),
      });
      toast.success("Requisition created");
      setForm({ department: "", priority: "normal", requiredDate: "", notes: "" });
      setItems([]);
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create requisition");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Requisition</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Department</Label>
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g., Operations" />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Required Date</Label>
              <Input type="date" value={form.requiredDate} onChange={(e) => setForm({ ...form, requiredDate: e.target.value })} />
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
                      <Label className="text-xs">Product Name</Label>
                      <Input value={item.productName} onChange={(e) => updateItem(idx, "productName", e.target.value)} placeholder="Item" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" step="0.01" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Unit</Label>
                      <Input value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Est. Cost</Label>
                      <Input type="number" step="0.01" value={item.estimatedCost} onChange={(e) => updateItem(idx, "estimatedCost", e.target.value)} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Vendor</Label>
                      <Input value={item.vendorName} onChange={(e) => updateItem(idx, "vendorName", e.target.value)} />
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
            <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Requisition"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
