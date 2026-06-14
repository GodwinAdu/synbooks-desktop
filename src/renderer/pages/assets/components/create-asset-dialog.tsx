/**
 * Create Fixed Asset Dialog
 */

import { useState } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ASSET_CATEGORIES, DEPRECIATION_METHODS } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateAssetDialog({ open, onClose, onCreated }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "Office Equipment",
    purchaseDate: new Date().toISOString().slice(0, 10),
    purchaseCost: "",
    depreciationMethod: "straight_line",
    usefulLifeYears: "5",
    salvageValue: "0",
    location: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.purchaseCost) return;
    setSaving(true);
    try {
      await api.post("/assets", {
        ...form,
        purchaseCost: parseFloat(form.purchaseCost),
        usefulLifeYears: parseInt(form.usefulLifeYears),
        salvageValue: parseFloat(form.salvageValue) || 0,
        status: "active",
        accumulatedDepreciation: 0,
        currentValue: parseFloat(form.purchaseCost),
      });
      toast.success("Asset registered successfully");
      setForm({ name: "", category: "Office Equipment", purchaseDate: new Date().toISOString().slice(0, 10), purchaseCost: "", depreciationMethod: "straight_line", usefulLifeYears: "5", salvageValue: "0", location: "", description: "" });
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to register asset");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Register Fixed Asset</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Asset Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Dell Laptop - Finance" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASSET_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Purchase Date</Label>
              <Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Purchase Cost (GHS) *</Label>
              <Input type="number" step="0.01" value={form.purchaseCost} onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Salvage Value (GHS)</Label>
              <Input type="number" step="0.01" value={form.salvageValue} onChange={(e) => setForm({ ...form, salvageValue: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Depreciation Method</Label>
              <Select value={form.depreciationMethod} onValueChange={(v) => setForm({ ...form, depreciationMethod: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPRECIATION_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Useful Life (Years)</Label>
              <Input type="number" min="1" value={form.usefulLifeYears} onChange={(e) => setForm({ ...form, usefulLifeYears: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g., Head Office - Room 3" />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Registering..." : "Register Asset"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
