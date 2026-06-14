/**
 * Production - Work Centers Tab
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
import { Plus, Search, Wrench } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import type { WorkCenter } from "../types";

const WC_STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  maintenance: "bg-amber-100 text-amber-700",
  inactive: "bg-gray-100 text-gray-700",
};

export function WorkCentersTab() {
  const [centers, setCenters] = useState<WorkCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetchCenters = () => {
    setLoading(true);
    api.get("/production/work-centers", { pageSize: 200 })
      .then((res: any) => setCenters(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCenters(); }, []);

  const filtered = centers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.code && c.code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Search / Create */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search work centers..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => setShowCreate(true)} className="ml-auto">
          <Plus className="h-4 w-4 mr-2" /> Add Work Center
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Wrench className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">No work centers found</p>
          <p className="text-sm">Add work centers to manage manufacturing capacity.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-semibold">Name</th>
                    <th className="text-left py-3 px-4 font-semibold">Code</th>
                    <th className="text-left py-3 px-4 font-semibold">Type</th>
                    <th className="text-right py-3 px-4 font-semibold">Capacity</th>
                    <th className="text-right py-3 px-4 font-semibold">Cost/Hour</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((wc) => (
                    <tr key={wc.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 font-medium">{wc.name}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{wc.code || "—"}</td>
                      <td className="py-2.5 px-4 capitalize">{wc.type.replace("_", " ")}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums">
                        {wc.capacity} {wc.capacityUnit}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums">{formatCurrency(wc.costPerHour)}</td>
                      <td className="py-2.5 px-4">
                        <Badge className={`text-xs ${WC_STATUS_COLORS[wc.status] || ""}`}>
                          {wc.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <CreateWorkCenterDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchCenters} />
    </div>
  );
}

function CreateWorkCenterDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    type: "workstation",
    capacity: "",
    capacityUnit: "units/hour",
    costPerHour: "",
    location: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post("/production/work-centers", {
        ...form,
        capacity: parseFloat(form.capacity) || 0,
        costPerHour: parseFloat(form.costPerHour) || 0,
      });
      toast.success("Work center created");
      setForm({ name: "", code: "", type: "workstation", capacity: "", capacityUnit: "units/hour", costPerHour: "", location: "", notes: "" });
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create work center");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Add Work Center</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Work center name" required />
            </div>
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g., WC-001" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="machine">Machine</SelectItem>
                  <SelectItem value="workstation">Workstation</SelectItem>
                  <SelectItem value="assembly_line">Assembly Line</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cost Per Hour</Label>
              <Input type="number" step="0.01" value={form.costPerHour} onChange={(e) => setForm({ ...form, costPerHour: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Capacity</Label>
              <Input type="number" step="0.01" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Capacity Unit</Label>
              <Input value={form.capacityUnit} onChange={(e) => setForm({ ...form, capacityUnit: e.target.value })} placeholder="e.g., units/hour" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Building / floor / area" />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Add Work Center"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
