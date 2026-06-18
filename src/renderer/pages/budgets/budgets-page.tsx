/**
 * Budgets Page
 * Matches the Next.js annual budgets: summary cards, budget list,
 * create dialog with line items (account + amount), info alert.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import {
  Plus, Trash2, Calendar, DollarSign, AlertCircle, TrendingUp, CalendarDays, Edit, Eye,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BudgetLine {
  accountId: string;
  accountCode?: string;
  accountName: string;
  budgetedAmount: number;
}

interface Budget {
  id: string;
  name: string;
  fiscalYear: number;
  startDate: string;
  endDate: string;
  totalBudget: number;
  totalActual: number;
  lineItems: BudgetLine[] | string;
  status: string;
  notes?: string;
  createdAt: string;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [viewBudget, setViewBudget] = useState<Budget | null>(null);

  const fetchBudgets = () => {
    setLoading(true);
    api.get("/budgets", { pageSize: 50 })
      .then((res: any) => {
        const data = (res.data || []).map((b: any) => ({
          ...b,
          lineItems: typeof b.lineItems === "string" ? JSON.parse(b.lineItems || "[]") : (b.lineItems || []),
        }));
        setBudgets(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBudgets(); }, []);

  const currentYear = new Date().getFullYear();
  const totalBudgeted = budgets.reduce((s, b) => s + (b.totalBudget || 0), 0);
  const activeBudgets = budgets.filter((b) => b.status === "active").length;
  const draftBudgets = budgets.filter((b) => b.status === "draft").length;
  const closedBudgets = budgets.filter((b) => b.status === "closed").length;

  return (
    <div className="flex-1 space-y-4 p-3 sm:p-6 lg:p-8 pt-4 sm:pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Heading title="Annual Budgets" description="Create and manage annual budgets" />
        <Button className="bg-gradient-to-r from-emerald-600 to-teal-600" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Create Budget
        </Button>
      </div>
      <Separator />

      {/* Info Alert */}
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
        <CalendarDays className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900 dark:text-green-200 font-semibold">Annual Budget Planning</AlertTitle>
        <AlertDescription className="text-green-800 dark:text-green-300 mt-2">
          <div className="space-y-2 text-sm">
            <p>Create and manage annual budgets to set financial targets and control spending across your organization.</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Define budget line items by account category for the full fiscal year</li>
              <li>Compare actual vs. budgeted figures in the variance analysis report</li>
              <li>Track spending progress with visual indicators</li>
            </ul>
            <p className="text-amber-700 dark:text-amber-400 font-medium">⚠ Budgets are planning tools — they do not restrict transactions but help you monitor and control spending.</p>
          </div>
        </AlertDescription>
      </Alert>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[90px]" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">{formatCurrency(totalBudgeted)}</div>
                <p className="text-xs text-muted-foreground mt-1">{currentYear}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Budgets</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">{activeBudgets}</div>
                <p className="text-xs text-muted-foreground mt-1">This year</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Draft Budgets</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">{draftBudgets}</div>
                <p className="text-xs text-muted-foreground mt-1">Pending activation</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Closed Budgets</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">{closedBudgets}</div>
                <p className="text-xs text-muted-foreground mt-1">Completed</p>
              </CardContent>
            </Card>
          </div>

          {/* Budget List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Annual Budgets</CardTitle>
            </CardHeader>
            <CardContent>
              {budgets.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-30" />
                  <p className="text-muted-foreground font-medium">No annual budgets created</p>
                  <p className="text-sm text-muted-foreground mt-2">Create your first annual budget to start tracking</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {budgets.map((budget) => {
                    const lines = Array.isArray(budget.lineItems) ? budget.lineItems : [];
                    return (
                      <div
                        key={budget.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{budget.name}</p>
                            <p className="text-sm text-muted-foreground">
                              FY {budget.fiscalYear} • {lines.length} account{lines.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-medium">{formatCurrency(budget.totalBudget)}</p>
                            <p className="text-xs text-muted-foreground">Total budget</p>
                          </div>
                          <Badge variant={budget.status === "active" ? "default" : budget.status === "draft" ? "secondary" : "outline"}>
                            {budget.status}
                          </Badge>
                          <Button size="sm" variant="outline" onClick={() => setViewBudget(budget)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Create Budget Dialog */}
      <CreateBudgetDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchBudgets} />

      {/* View Budget Detail Dialog */}
      {viewBudget && (
        <BudgetDetailDialog budget={viewBudget} onClose={() => setViewBudget(null)} onUpdated={fetchBudgets} />
      )}
    </div>
  );
}

// ─── Create Budget Dialog ────────────────────────────────────────────────────

function CreateBudgetDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const currentYear = new Date().getFullYear();

  const [form, setForm] = useState({
    name: "",
    fiscalYear: String(currentYear),
    startDate: `${currentYear}-01-01`,
    endDate: `${currentYear}-12-31`,
    notes: "",
    status: "draft",
  });
  const [lineItems, setLineItems] = useState<{ accountId: string; accountName: string; budgetedAmount: number }[]>([
    { accountId: "", accountName: "", budgetedAmount: 0 },
  ]);

  useEffect(() => {
    if (open) {
      api.get("/accounts", { accountType: "expense", pageSize: 200 })
        .then((res: any) => {
          const expenseAccts = Array.isArray(res) ? res : res.data || [];
          api.get("/accounts", { accountType: "revenue", pageSize: 200 })
            .then((revRes: any) => {
              const revenueAccts = Array.isArray(revRes) ? revRes : revRes.data || [];
              setAccounts([...revenueAccts, ...expenseAccts]);
            });
        })
        .catch(() => {});
    }
  }, [open]);

  const handleAddLine = () => {
    setLineItems([...lineItems, { accountId: "", accountName: "", budgetedAmount: 0 }]);
  };

  const handleRemoveLine = (idx: number) => {
    if (lineItems.length > 1) setLineItems(lineItems.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx: number, field: string, value: any) => {
    const updated = [...lineItems];
    if (field === "accountId") {
      const account = accounts.find((a) => a.id === value);
      updated[idx] = { ...updated[idx], accountId: value, accountName: account?.accountName || account?.name || "" };
    } else {
      updated[idx] = { ...updated[idx], [field]: value };
    }
    setLineItems(updated);
  };

  const totalPlanned = lineItems.reduce((s, l) => s + (l.budgetedAmount || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Budget name is required"); return; }
    const validLines = lineItems.filter((l) => l.accountId && l.budgetedAmount > 0);
    if (validLines.length === 0) { toast.error("Add at least one budget line item"); return; }

    setSaving(true);
    try {
      await api.post("/budgets", {
        name: form.name,
        fiscalYear: parseInt(form.fiscalYear),
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
        notes: form.notes,
        lineItems: JSON.stringify(validLines),
        totalBudget: totalPlanned,
        totalActual: 0,
      });
      toast.success("Budget created successfully");
      setForm({ name: "", fiscalYear: String(currentYear), startDate: `${currentYear}-01-01`, endDate: `${currentYear}-12-31`, notes: "", status: "draft" });
      setLineItems([{ accountId: "", accountName: "", budgetedAmount: 0 }]);
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to create budget");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="md:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Annual Budget</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Budget Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="FY 2026 Operating Budget" required />
            </div>
            <div className="space-y-2">
              <Label>Fiscal Year</Label>
              <Select value={form.fiscalYear} onValueChange={(v) => setForm({ ...form, fiscalYear: v, startDate: `${v}-01-01`, endDate: `${v}-12-31` })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>End Date *</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Budget Line Items *</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Add revenue and expense accounts with planned amounts</p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={handleAddLine}>
                <Plus className="h-4 w-4 mr-1" /> Add Line
              </Button>
            </div>

            {lineItems.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-end border p-3 rounded-lg">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Account *</Label>
                  <Select value={item.accountId || "none"} onValueChange={(v) => handleLineChange(idx, "accountId", v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select account</SelectItem>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.accountCode ? `${a.accountCode} — ` : ""}{a.accountName || a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-40 space-y-1">
                  <Label className="text-xs">Amount (GHS)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.budgetedAmount || ""}
                    onChange={(e) => handleLineChange(idx, "budgetedAmount", Number(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-red-500" onClick={() => handleRemoveLine(idx)} disabled={lineItems.length === 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Additional notes..." />
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm">
              <span className="text-muted-foreground">Total Planned: </span>
              <span className="font-semibold">{formatCurrency(totalPlanned)}</span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="bg-gradient-to-r from-emerald-600 to-teal-600" disabled={saving}>
                {saving ? "Creating..." : "Create Budget"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Budget Detail Dialog ────────────────────────────────────────────────────

function BudgetDetailDialog({ budget, onClose, onUpdated }: { budget: Budget; onClose: () => void; onUpdated: () => void }) {
  const lines = Array.isArray(budget.lineItems) ? budget.lineItems : [];
  const [activating, setActivating] = useState(false);

  const handleActivate = async () => {
    setActivating(true);
    try {
      await api.put(`/budgets/${budget.id}`, { status: "active" });
      toast.success("Budget activated");
      onUpdated();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setActivating(false);
    }
  };

  const handleClose = async () => {
    try {
      await api.put(`/budgets/${budget.id}`, { status: "closed" });
      toast.success("Budget closed");
      onUpdated();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="md:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{budget.name}</DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={budget.status === "active" ? "default" : budget.status === "draft" ? "secondary" : "outline"}>
              {budget.status}
            </Badge>
            <span className="text-sm text-muted-foreground">FY {budget.fiscalYear}</span>
            <span className="text-sm text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">
              {new Date(budget.startDate).toLocaleDateString("en-GH", { day: "numeric", month: "short" })} – {new Date(budget.endDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Total Budget</p>
            <p className="text-lg font-bold">{formatCurrency(budget.totalBudget)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Line Items</p>
            <p className="text-lg font-bold">{lines.length}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="text-lg font-bold capitalize">{budget.status}</p>
          </div>
        </div>

        {/* Line Items Table */}
        {lines.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-2.5 px-4 font-semibold">Account</th>
                  <th className="text-right py-2.5 px-4 font-semibold">Planned Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line: any, idx: number) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2 px-4">{line.accountName || line.accountId}</td>
                    <td className="py-2 px-4 text-right tabular-nums font-medium">{formatCurrency(line.budgetedAmount || line.amount || 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 font-bold">
                  <td className="py-2.5 px-4">Total</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">{formatCurrency(budget.totalBudget)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {budget.notes && (
          <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Notes</p>
            {budget.notes}
          </div>
        )}

        {/* Actions */}
        <DialogFooter>
          {budget.status === "draft" && (
            <Button onClick={handleActivate} disabled={activating} className="bg-emerald-600 hover:bg-emerald-700">
              {activating ? "Activating..." : "Activate Budget"}
            </Button>
          )}
          {budget.status === "active" && (
            <Button variant="outline" onClick={handleClose}>Close Budget</Button>
          )}
          <Button variant="outline" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
