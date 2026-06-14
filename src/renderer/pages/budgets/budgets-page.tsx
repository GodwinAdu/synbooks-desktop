/**
 * Budgets Page
 * Budget planning, tracking, and variance analysis.
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { Plus, PieChart, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { Budget } from "./types";

export function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchBudgets = () => {
    setLoading(true);
    api.get("/budgets", { pageSize: 50 })
      .then((res: any) => setBudgets(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchBudgets(); }, []);

  const totalBudgeted = budgets.reduce((s, b) => s + (b.totalBudget || 0), 0);
  const totalActual = budgets.reduce((s, b) => s + (b.totalActual || 0), 0);
  const overallVariance = totalBudgeted - totalActual;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Heading title="Budgets" description="Plan, track, and compare budget vs actual spending" />
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Budget
        </Button>
      </div>
      <Separator />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          {budgets.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total Budgets" value={String(budgets.length)} icon={PieChart} color="text-blue-600" />
              <StatCard label="Total Budgeted" value={formatCurrency(totalBudgeted)} icon={TrendingUp} color="text-blue-600" />
              <StatCard label="Total Actual" value={formatCurrency(totalActual)} icon={TrendingUp} color="text-orange-600" />
              <StatCard
                label="Variance"
                value={formatCurrency(Math.abs(overallVariance))}
                icon={AlertTriangle}
                color={overallVariance >= 0 ? "text-emerald-600" : "text-red-600"}
                suffix={overallVariance >= 0 ? " under" : " over"}
              />
            </div>
          )}

          {/* Budget Cards */}
          {budgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <PieChart className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">No budgets found</p>
              <p className="text-sm">Create your first budget to start tracking spending.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {budgets.map((budget) => {
                const progress = budget.totalBudget > 0
                  ? Math.min(Math.round((budget.totalActual / budget.totalBudget) * 100), 100)
                  : 0;
                const isOverBudget = budget.totalActual > budget.totalBudget && budget.totalBudget > 0;

                return (
                  <Card key={budget.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{budget.name}</p>
                          <p className="text-xs text-muted-foreground">
                            FY {budget.fiscalYear || "—"}
                          </p>
                        </div>
                        <Badge className={`text-[10px] ${budget.status === "active" ? "bg-emerald-100 text-emerald-700" : budget.status === "draft" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
                          {budget.status}
                        </Badge>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Budget</span>
                        <span className="font-medium">{formatCurrency(budget.totalBudget || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Actual</span>
                        <span className={`font-medium ${isOverBudget ? "text-red-600" : ""}`}>
                          {formatCurrency(budget.totalActual || 0)}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Spent</span>
                          <span className={isOverBudget ? "text-red-600 font-medium" : ""}>{progress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isOverBudget ? "bg-red-500" : progress >= 80 ? "bg-amber-500" : "bg-primary"}`}
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>

                      {isOverBudget && (
                        <div className="flex items-center gap-1.5 text-xs text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Over budget by {formatCurrency(budget.totalActual - budget.totalBudget)}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <CreateBudgetDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchBudgets} />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, suffix }: { label: string; value: string; icon: any; color: string; suffix?: string }) {
  return (
    <Card className="border-0 ring-1 ring-border/50">
      <CardContent className="pt-4 pb-3 flex items-center gap-3">
        <Icon className={`h-5 w-5 ${color}`} />
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
          <p className={`text-base font-bold ${color}`}>{value}{suffix}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateBudgetDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const currentYear = new Date().getFullYear();
  const [form, setForm] = useState({
    name: "",
    fiscalYear: String(currentYear),
    totalBudget: "",
    status: "draft",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await api.post("/budgets", {
        ...form,
        totalBudget: parseFloat(form.totalBudget) || 0,
        startDate: `${form.fiscalYear}-01-01`,
        endDate: `${form.fiscalYear}-12-31`,
      });
      toast.success("Budget created");
      setForm({ name: "", fiscalYear: String(currentYear), totalBudget: "", status: "draft" });
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New Budget</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Budget Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Q1 Operating Budget" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fiscal Year</Label>
              <Select value={form.fiscalYear} onValueChange={(v) => setForm({ ...form, fiscalYear: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Total Amount (GHS)</Label>
              <Input type="number" step="0.01" value={form.totalBudget} onChange={(e) => setForm({ ...form, totalBudget: e.target.value })} placeholder="0.00" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create Budget"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
