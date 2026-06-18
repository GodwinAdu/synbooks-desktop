/**
 * CRM Deals Tab
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
import { Plus, Search, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { DEAL_STAGES, type Deal } from "../types";

export function DealsTab() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetchDeals = () => {
    setLoading(true);
    api.get("/crm/deals", { pageSize: 200 })
      .then((res: any) => setDeals(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDeals(); }, []);

  const filtered = deals.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    (d.contactName && d.contactName.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPipeline = filtered.filter((d) => !d.stage.startsWith("closed")).reduce((s, d) => s + d.amount, 0);
  const wonAmount = filtered.filter((d) => d.stage === "closed_won").reduce((s, d) => s + d.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search deals..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-4 ml-auto text-sm">
          <span className="text-muted-foreground">Pipeline: <span className="font-bold text-foreground">{formatCurrency(totalPipeline)}</span></span>
          <span className="text-muted-foreground">Won: <span className="font-bold text-emerald-600">{formatCurrency(wonAmount)}</span></span>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Deal
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <TrendingUp className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">No deals found</p>
          <p className="text-sm">Create your first deal to track sales opportunities.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-semibold">Deal</th>
                    <th className="text-left py-3 px-4 font-semibold">Contact</th>
                    <th className="text-right py-3 px-4 font-semibold">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold">Stage</th>
                    <th className="text-right py-3 px-4 font-semibold">Probability</th>
                    <th className="text-left py-3 px-4 font-semibold">Close Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((deal) => {
                    const stage = DEAL_STAGES.find((s) => s.id === deal.stage);
                    return (
                      <tr key={deal.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 font-medium">{deal.title}</td>
                        <td className="py-2.5 px-4 text-muted-foreground">{deal.contactName || "—"}</td>
                        <td className="py-2.5 px-4 text-right tabular-nums font-medium">{formatCurrency(deal.amount)}</td>
                        <td className="py-2.5 px-4">
                          <Badge className="text-xs" style={{ backgroundColor: `${stage?.color}20`, color: stage?.color }}>
                            {stage?.label || deal.stage}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums">{deal.probability}%</td>
                        <td className="py-2.5 px-4 text-muted-foreground text-xs">
                          {deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" }) : "—"}
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

      <CreateDealDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchDeals} />
    </div>
  );
}

function CreateDealDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: "", contactId: "", amount: "", stage: "qualification", probability: "25", expectedCloseDate: "", notes: "",
  });

  useEffect(() => {
    if (open) {
      api.get("/crm/contacts", { pageSize: 200 }).then((res: any) => setContacts(res.data || [])).catch(() => {});
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post("/crm/deals", {
        ...form,
        amount: parseFloat(form.amount) || 0,
        probability: parseInt(form.probability) || 25,
        contactId: form.contactId || null,
      });
      toast.success("Deal created");
      setForm({ title: "", contactId: "", amount: "", stage: "qualification", probability: "25", expectedCloseDate: "", notes: "" });
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create deal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Add Deal</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Deal Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Enterprise License" required />
          </div>
          <div className="space-y-2">
            <Label>Contact</Label>
            <Select value={form.contactId || "none"} onValueChange={(v) => setForm({ ...form, contactId: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Select contact (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No contact</SelectItem>
                {contacts.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount (GHS)</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Probability (%)</Label>
              <Input type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEAL_STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expected Close</Label>
              <Input type="date" value={form.expectedCloseDate} onChange={(e) => setForm({ ...form, expectedCloseDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add Deal"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
