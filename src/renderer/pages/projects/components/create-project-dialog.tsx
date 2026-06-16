/**
 * Create Project Dialog
 * Matches the Next.js app's project form: client, manager, billing, dates, budget, etc.
 */

import { useState, useEffect } from "react";
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
import { Plus } from "lucide-react";

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];
const CATEGORIES = ["Consulting", "Development", "Design", "Marketing", "Audit", "Tax Filing", "Bookkeeping", "Advisory", "Implementation", "Other"];

export function CreateProjectDialog({ open, onClose, onCreated }: CreateProjectDialogProps) {
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    customerId: "",
    managerId: "",
    status: "planning",
    priority: "medium",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    budget: "",
    billingMethod: "fixed",
    hourlyRate: "",
    fixedPrice: "",
    category: "",
    color: COLORS[0],
    notes: "",
    revenueAccountId: "",
    expenseAccountId: "",
    wipAccountId: "",
  });

  useEffect(() => {
    if (open) {
      api.get("/customers", { pageSize: 200 }).then((r: any) => setCustomers(r.data || [])).catch(() => {});
      api.get("/users").then((r: any) => setUsers(r.users || [])).catch(() => {});
    }
  }, [open]);

  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim()) return;
    setCreatingCustomer(true);
    try {
      const result: any = await api.post("/customers", { name: newCustomerName.trim() });
      const newCust = result.data || result;
      setCustomers((prev) => [...prev, newCust]);
      setForm({ ...form, customerId: newCust.id });
      setNewCustomerName("");
      setShowNewCustomer(false);
      toast.success("Customer created");
    } catch (err: any) {
      toast.error(err.message || "Failed to create customer");
    } finally {
      setCreatingCustomer(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post("/projects", {
        ...form,
        budget: form.budget ? parseFloat(form.budget) : 0,
        hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : 0,
        fixedPrice: form.fixedPrice ? parseFloat(form.fixedPrice) : 0,
        customerId: form.customerId || null,
        managerId: form.managerId || null,
      });
      toast.success("Project created successfully");
      setForm({ name: "", description: "", customerId: "", managerId: "", status: "planning", priority: "medium", startDate: new Date().toISOString().slice(0, 10), endDate: "", budget: "", billingMethod: "fixed", hourlyRate: "", fixedPrice: "", category: "", color: COLORS[0], notes: "", revenueAccountId: "", expenseAccountId: "", wipAccountId: "" });
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Project Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Website Redesign" required />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Project description..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client (Customer)</Label>
                {!showNewCustomer ? (
                  <div className="flex gap-1">
                    <Select value={form.customerId || "none"} onValueChange={(v) => setForm({ ...form, customerId: v === "none" ? "" : v })}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select client" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No client</SelectItem>
                        {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" className="shrink-0 h-9 w-9" onClick={() => setShowNewCustomer(true)} title="Create new customer">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <Input value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="New customer name..." className="flex-1" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateCustomer(); } }} />
                    <Button type="button" size="sm" onClick={handleCreateCustomer} disabled={creatingCustomer || !newCustomerName.trim()}>
                      {creatingCustomer ? "..." : "Add"}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewCustomer(false)}>✕</Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Project Manager</Label>
                <Select value={form.managerId || "none"} onValueChange={(v) => setForm({ ...form, managerId: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.fullName || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Dates & Priority */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Billing & Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Billing Method</Label>
              <Select value={form.billingMethod} onValueChange={(v) => setForm({ ...form, billingMethod: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Price</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="milestone">Milestone-Based</SelectItem>
                  <SelectItem value="non_billable">Non-Billable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Budget (GHS)</Label>
              <Input type="number" step="0.01" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="0.00" />
            </div>
          </div>

          {form.billingMethod === "hourly" && (
            <div className="space-y-2">
              <Label>Hourly Rate (GHS)</Label>
              <Input type="number" step="0.01" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} placeholder="0.00" className="max-w-xs" />
            </div>
          )}
          {form.billingMethod === "fixed" && (
            <div className="space-y-2">
              <Label>Fixed Price (GHS)</Label>
              <Input type="number" step="0.01" value={form.fixedPrice} onChange={(e) => setForm({ ...form, fixedPrice: e.target.value })} placeholder="0.00" className="max-w-xs" />
            </div>
          )}

          {/* Category & Color */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category || "none"} onValueChange={(v) => setForm({ ...form, category: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button key={c} type="button"
                    className={`h-7 w-7 rounded-full border-2 transition-all ${form.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setForm({ ...form, color: c })}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Internal Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Notes visible to your team..." />
          </div>

          {/* Accounting (Optional) */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <div>
              <p className="text-sm font-medium">Accounting (Optional)</p>
              <p className="text-xs text-muted-foreground">Link to specific accounts. If left empty, default accounts are created automatically.</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Revenue Account</Label>
                <AccountSelect value={form.revenueAccountId} onChange={(v) => setForm({ ...form, revenueAccountId: v })} accountType="revenue" placeholder="Auto (Sales Revenue)" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Expense Account</Label>
                <AccountSelect value={form.expenseAccountId} onChange={(v) => setForm({ ...form, expenseAccountId: v })} accountType="expense" placeholder="Auto (Project Expenses)" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">WIP Account</Label>
                <AccountSelect value={form.wipAccountId} onChange={(v) => setForm({ ...form, wipAccountId: v })} accountType="asset" placeholder="None (optional)" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Project"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


// ─── Account Selector (fetches accounts by type) ────────────────────────────
function AccountSelect({ value, onChange, accountType, placeholder }: { value: string; onChange: (v: string) => void; accountType: string; placeholder: string }) {
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    api.get("/accounts", { accountType, pageSize: 100 })
      .then((r: any) => setAccounts(Array.isArray(r) ? r : r.data || []))
      .catch(() => {});
  }, [accountType]);

  return (
    <Select value={value || "auto"} onValueChange={(v) => onChange(v === "auto" ? "" : v)}>
      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="auto">{placeholder}</SelectItem>
        {accounts.map((a: any) => (
          <SelectItem key={a.id} value={a.id}>{a.accountCode ? `${a.accountCode} — ` : ""}{a.accountName || a.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
