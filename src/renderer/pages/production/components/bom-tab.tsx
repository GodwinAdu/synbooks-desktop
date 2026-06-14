/**
 * Production - Bill of Materials Tab
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
import { Plus, Search, Layers, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import type { BillOfMaterials, BOMaterial } from "../types";

export function BOMTab() {
  const [boms, setBoms] = useState<BillOfMaterials[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetchBOMs = () => {
    setLoading(true);
    api.get("/production/boms", { pageSize: 200 })
      .then((res: any) => setBoms(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBOMs(); }, []);

  const filtered = boms.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.bomNumber.toLowerCase().includes(search.toLowerCase()) ||
    (b.productName && b.productName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Search / Create */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search BOMs..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => setShowCreate(true)} className="ml-auto">
          <Plus className="h-4 w-4 mr-2" /> New BOM
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Layers className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">No bills of materials found</p>
          <p className="text-sm">Create a BOM to define manufacturing recipes.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-semibold">BOM #</th>
                    <th className="text-left py-3 px-4 font-semibold">Name</th>
                    <th className="text-left py-3 px-4 font-semibold">Product</th>
                    <th className="text-right py-3 px-4 font-semibold">Output Qty</th>
                    <th className="text-right py-3 px-4 font-semibold">Cost/Unit</th>
                    <th className="text-right py-3 px-4 font-semibold">Materials</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((bom) => (
                    <tr key={bom.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 font-medium">{bom.bomNumber}</td>
                      <td className="py-2.5 px-4">{bom.name}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{bom.productName || "—"}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums">
                        {bom.outputQuantity} {bom.outputUnit}
                      </td>
                      <td className="py-2.5 px-4 text-right tabular-nums">{formatCurrency(bom.costPerUnit)}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums">{bom.materials?.length || 0}</td>
                      <td className="py-2.5 px-4">
                        <Badge className={`text-xs ${bom.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>
                          {bom.isActive ? "Active" : "Inactive"}
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

      <CreateBOMDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchBOMs} />
    </div>
  );
}

function CreateBOMDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    productName: "",
    outputQuantity: "",
    outputUnit: "pcs",
    notes: "",
  });
  const [materials, setMaterials] = useState<Array<{
    productName: string; quantity: string; unit: string; costPerUnit: string; wastagePercent: string;
  }>>([]);

  const addMaterial = () => {
    setMaterials([...materials, { productName: "", quantity: "", unit: "pcs", costPerUnit: "", wastagePercent: "0" }]);
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const updateMaterial = (index: number, field: string, value: string) => {
    const updated = [...materials];
    (updated[index] as any)[field] = value;
    setMaterials(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post("/production/boms", {
        ...form,
        outputQuantity: parseFloat(form.outputQuantity) || 1,
        materials: materials.map((m) => ({
          productName: m.productName,
          quantity: parseFloat(m.quantity) || 0,
          unit: m.unit,
          costPerUnit: parseFloat(m.costPerUnit) || 0,
          wastagePercent: parseFloat(m.wastagePercent) || 0,
        })),
      });
      toast.success("Bill of Materials created");
      setForm({ name: "", productName: "", outputQuantity: "", outputUnit: "pcs", notes: "" });
      setMaterials([]);
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create BOM");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Bill of Materials</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="BOM name" required />
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <Input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder="Output product" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Output Quantity</Label>
              <Input type="number" min="1" step="0.01" value={form.outputQuantity} onChange={(e) => setForm({ ...form, outputQuantity: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Output Unit</Label>
              <Input value={form.outputUnit} onChange={(e) => setForm({ ...form, outputUnit: e.target.value })} />
            </div>
          </div>

          {/* Materials List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Materials</Label>
              <Button type="button" variant="outline" size="sm" onClick={addMaterial}>
                <Plus className="h-3 w-3 mr-1" /> Add Material
              </Button>
            </div>
            {materials.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No materials added yet. Click "Add Material" to begin.</p>
            ) : (
              <div className="space-y-3">
                {materials.map((mat, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end border p-3 rounded-md">
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Product</Label>
                      <Input value={mat.productName} onChange={(e) => updateMaterial(idx, "productName", e.target.value)} placeholder="Material" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input type="number" step="0.01" value={mat.quantity} onChange={(e) => updateMaterial(idx, "quantity", e.target.value)} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Unit</Label>
                      <Input value={mat.unit} onChange={(e) => updateMaterial(idx, "unit", e.target.value)} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Cost/Unit</Label>
                      <Input type="number" step="0.01" value={mat.costPerUnit} onChange={(e) => updateMaterial(idx, "costPerUnit", e.target.value)} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Wastage %</Label>
                      <Input type="number" step="0.1" value={mat.wastagePercent} onChange={(e) => updateMaterial(idx, "wastagePercent", e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeMaterial(idx)}>
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
            <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create BOM"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
