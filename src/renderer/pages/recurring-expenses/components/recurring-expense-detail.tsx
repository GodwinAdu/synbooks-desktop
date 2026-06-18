/**
 * Recurring Expense Detail View
 * Shows template info, schedule, and actions.
 */

import { useState } from "react";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Play, Pause, Zap, Trash2, Loader2, CalendarClock, Repeat, DollarSign,
} from "lucide-react";
import type { RecurringExpense } from "../types";

const frequencyLabels: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

interface Props {
  expense: RecurringExpense;
  onBack: () => void;
}

export function RecurringExpenseDetail({ expense, onBack }: Props) {
  const [current, setCurrent] = useState(expense);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleToggle = async () => {
    setActionLoading("toggle");
    try {
      await api.put(`/recurring-expenses/${current.id}`, { isActive: current.isActive ? 0 : 1 });
      setCurrent({ ...current, isActive: current.isActive ? 0 : 1 });
      toast.success(current.isActive ? "Recurring expense paused" : "Recurring expense resumed");
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setActionLoading(null); }
  };

  const handleGenerateNow = async () => {
    setActionLoading("generate");
    try {
      await api.post(`/recurring-expenses/${current.id}/generate`);
      toast.success("Draft expense generated! Check the Expenses page.");
    } catch (e: any) { toast.error(e.message || "Failed to generate"); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this recurring expense? This cannot be undone.")) return;
    setActionLoading("delete");
    try {
      await api.delete(`/recurring-expenses/${current.id}`);
      toast.success("Recurring expense deleted");
      onBack();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setActionLoading(null); }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{current.name}</h1>
              <Badge variant="outline" className={current.isActive ? "border-emerald-500 text-emerald-600" : "border-gray-300 text-gray-500"}>
                {current.isActive ? "Active" : "Paused"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{current.vendorName || "No vendor"}</p>
          </div>
        </div>
        {/* Actions */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleToggle} disabled={!!actionLoading}>
            {actionLoading === "toggle" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : current.isActive ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            {current.isActive ? "Pause" : "Resume"}
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleGenerateNow} disabled={!!actionLoading}>
            {actionLoading === "generate" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
            Generate Now
          </Button>
          <Button size="sm" variant="destructive" onClick={handleDelete} disabled={!!actionLoading}>
            {actionLoading === "delete" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
            Delete
          </Button>
        </div>
      </div>
      <Separator />

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                <Repeat className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Frequency</p>
                <p className="text-lg font-bold">{frequencyLabels[current.frequency] || current.frequency}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                <CalendarClock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Next Expense</p>
                <p className="text-lg font-bold">{formatDate(current.nextExpenseDate || current.nextRunDate || '') || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Amount per Expense</p>
                <p className="text-lg font-bold">{formatCurrency(current.amount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Details */}
      <Card>
        <CardHeader><CardTitle className="text-base">Schedule Details</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-muted-foreground">Start Date</p>
              <p className="font-medium">{formatDate(current.startDate || '') || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">End Date</p>
              <p className="font-medium">{current.endDate ? formatDate(current.endDate) : "No end date"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Generated</p>
              <p className="font-medium">{current.lastGeneratedAt ? formatDate(current.lastGeneratedAt) : "Never"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Category</p>
              <p className="font-medium">{current.category || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {current.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{current.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
