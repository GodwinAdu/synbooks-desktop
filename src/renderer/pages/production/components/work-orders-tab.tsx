/**
 * Production - Work Orders Tab
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
import { Plus, Search, Factory, ClipboardList, CheckCircle2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import type { WorkOrder } from "../types";
import { WO_STATUS_COLORS } from "../types";

export function WorkOrdersTab() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);

  const fetchWorkOrders = () => {
    setLoading(true);
    api.get("/production/work-orders", { pageSize: 200 })
      .then((res: any) => setWorkOrders(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchWorkOrders(); }, []);

  const filtered = workOrders.filter((wo) => {
    const matchSearch =
      wo.workOrderNumber.toLowerCase().includes(search.toLowerCase()) ||
      (wo.productName && wo.productName.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "all" || wo.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const inProduction = workOrders.filter((wo) => wo.status === "in_progress").length;
  const planned = workOrders.filter((wo) => wo.status === "planned").length;
  const completed = workOrders.filter((wo) => wo.status === "completed").length;
  const totalQty = workOrders.reduce((s, wo) => s + wo.quantity, 0);
  const totalCompleted = workOrders.reduce((s, wo) => s + wo.completedQuantity, 0);
  const yieldRate = totalQty > 0 ? Math.round((totalCompleted / totalQty) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Factory className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Production</p>
                <p className="text-2xl font-bold">{inProduction}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Planned</p>
                <p className="text-2xl font-bold">{planned}</p>
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
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Yield Rate</p>
                <p className="text-2xl font-bold">{yieldRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search / Filter / Create */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search work orders..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowCreate(true)} className="ml-auto">
          <Plus className="h-4 w-4 mr-2" /> New Work Order
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Factory className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">No work orders found</p>
          <p className="text-sm">Create your first work order to start manufacturing.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-semibold">WO #</th>
                    <th className="text-left py-3 px-4 font-semibold">Product</th>
                    <th className="text-right py-3 px-4 font-semibold">Quantity</th>
                    <th className="text-left py-3 px-4 font-semibold">Progress</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Due Date</th>
                    <th className="text-right py-3 px-4 font-semibold">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((wo) => {
                    const progress = wo.quantity > 0 ? Math.round((wo.completedQuantity / wo.quantity) * 100) : 0;
                    return (
                      <tr key={wo.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 font-medium">{wo.workOrderNumber}</td>
                        <td className="py-2.5 px-4">{wo.productName || "—"}</td>
                        <td className="py-2.5 px-4 text-right tabular-nums">
                          {wo.completedQuantity}/{wo.quantity}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[100px]">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{progress}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <Badge className={`text-xs ${WO_STATUS_COLORS[wo.status] || ""}`}>
                            {wo.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground text-xs">
                          {wo.dueDate ? new Date(wo.dueDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums">
                          {formatCurrency(wo.actualCost || wo.estimatedCost)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <CreateWorkOrderDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchWorkOrders} />
    </div>
  );
}

function CreateWorkOrderDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    productName: "",
    bomName: "",
    quantity: "",
    priority: "normal",
    workCenterName: "",
    startDate: "",
    dueDate: "",
    estimatedCost: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.quantity) return;
    setSaving(true);
    try {
      await api.post("/production/work-orders", {
        ...form,
        quantity: parseFloat(form.quantity) || 0,
        estimatedCost: parseFloat(form.estimatedCost) || 0,
      });
      toast.success("Work order created");
      setForm({ productName: "", bomName: "", quantity: "", priority: "normal", workCenterName: "", startDate: "", dueDate: "", estimatedCost: "", notes: "" });
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create work order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>New Work Order</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <Input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder="Product name" />
            </div>
            <div className="space-y-2">
              <Label>BOM</Label>
              <Input value={form.bomName} onChange={(e) => setForm({ ...form, bomName: e.target.value })} placeholder="Bill of materials" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity *</Label>
              <Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
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
          </div>
          <div className="space-y-2">
            <Label>Work Center</Label>
            <Input value={form.workCenterName} onChange={(e) => setForm({ ...form, workCenterName: e.target.value })} placeholder="Work center name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Estimated Cost</Label>
            <Input type="number" step="0.01" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Work Order"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
