/**
 * Contracts Module Page
 * Manages service agreements, subscriptions, retainers, and project contracts
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
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
import { Switch } from "@/components/ui/switch";
import { Plus, Search, FileText, CheckCircle2, AlertTriangle, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import type { Contract } from "./types";
import { CONTRACT_STATUS_COLORS } from "./types";

export function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);

  const fetchContracts = () => {
    setLoading(true);
    api.get("/contracts", { pageSize: 200 })
      .then((res: any) => setContracts(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchContracts(); }, []);

  const filtered = contracts.filter((c) => {
    const matchSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
      (c.customerName && c.customerName.toLowerCase().includes(search.toLowerCase())) ||
      (c.vendorName && c.vendorName.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalContracts = contracts.length;
  const active = contracts.filter((c) => c.status === "active").length;
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringSoon = contracts.filter((c) => {
    if (c.status !== "active" || !c.endDate) return false;
    const end = new Date(c.endDate);
    return end <= thirtyDaysFromNow && end >= now;
  }).length;
  const totalValue = contracts.reduce((s, c) => s + c.value, 0);

  return (
    <div className="p-6 space-y-6">
      <Heading title="Contracts" description="Manage service agreements, subscriptions, and retainers" />
      <Separator />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Contracts</p>
                <p className="text-2xl font-bold">{totalContracts}</p>
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
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold text-amber-600">{expiringSoon}</p>
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

      {/* Search / Filter / Create */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search contracts..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="renewed">Renewed</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowCreate(true)} className="ml-auto">
          <Plus className="h-4 w-4 mr-2" /> New Contract
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
          <p className="text-lg font-medium">No contracts found</p>
          <p className="text-sm">Create your first contract to track agreements.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 font-semibold">Contract #</th>
                    <th className="text-left py-3 px-4 font-semibold">Title</th>
                    <th className="text-left py-3 px-4 font-semibold">Customer/Vendor</th>
                    <th className="text-left py-3 px-4 font-semibold">Type</th>
                    <th className="text-right py-3 px-4 font-semibold">Value</th>
                    <th className="text-left py-3 px-4 font-semibold">Billing</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Dates</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((contract) => (
                    <tr key={contract.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 font-medium">{contract.contractNumber}</td>
                      <td className="py-2.5 px-4">{contract.title}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        {contract.customerName || contract.vendorName || "—"}
                      </td>
                      <td className="py-2.5 px-4 capitalize">{contract.type}</td>
                      <td className="py-2.5 px-4 text-right tabular-nums font-medium">
                        {formatCurrency(contract.value)}
                      </td>
                      <td className="py-2.5 px-4 text-xs capitalize text-muted-foreground">
                        {contract.billingFrequency.replace("_", " ")}
                      </td>
                      <td className="py-2.5 px-4">
                        <Badge className={`text-xs ${CONTRACT_STATUS_COLORS[contract.status] || ""}`}>
                          {contract.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-muted-foreground">
                        {new Date(contract.startDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                        {contract.endDate && (
                          <> — {new Date(contract.endDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}</>
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

      <CreateContractDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchContracts} />
    </div>
  );
}

function CreateContractDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    customerName: "",
    vendorName: "",
    type: "service",
    value: "",
    billingFrequency: "monthly",
    startDate: "",
    endDate: "",
    autoRenew: false,
    description: "",
    terms: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await api.post("/contracts", {
        ...form,
        value: parseFloat(form.value) || 0,
      });
      toast.success("Contract created");
      setForm({ title: "", customerName: "", vendorName: "", type: "service", value: "", billingFrequency: "monthly", startDate: "", endDate: "", autoRenew: false, description: "", terms: "" });
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create contract");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Contract</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contract title" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Customer name" />
            </div>
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Input value={form.vendorName} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} placeholder="Vendor name" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="retainer">Retainer</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Billing Frequency</Label>
              <Select value={form.billingFrequency} onValueChange={(v) => setForm({ ...form, billingFrequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One Time</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.autoRenew} onCheckedChange={(checked) => setForm({ ...form, autoRenew: checked })} />
            <Label>Auto-renew contract</Label>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Brief description of the contract scope" />
          </div>
          <div className="space-y-2">
            <Label>Terms & Conditions</Label>
            <Textarea value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} rows={3} placeholder="Contract terms and conditions" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Contract"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
