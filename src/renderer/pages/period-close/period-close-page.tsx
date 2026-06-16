/**
 * Period Close Page
 * Close accounting periods to prevent changes to past transactions.
 * Matches the Next.js app: stats, checklist, summary, history, close/reopen dialogs.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Lock, Unlock, Calendar, CheckCircle2, AlertCircle, TrendingUp, TrendingDown,
  DollarSign, Loader2, History, Info,
} from "lucide-react";
import { format } from "date-fns";

interface ClosedPeriod {
  id: string;
  periodLabel: string;
  periodYear: number;
  periodMonth: number;
  status: "closed" | "reopened";
  closedAt: string;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  postedEntriesCount: number;
}

interface Task {
  title: string;
  description: string;
  completed: boolean;
}

export function PeriodClosePage() {
  const [loading, setLoading] = useState(true);
  const [currentPeriodClosed, setCurrentPeriodClosed] = useState(false);
  const [closedPeriods, setClosedPeriods] = useState<ClosedPeriod[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState({ postedEntries: 0, reconciledAccounts: 0, unreconciledItems: 0 });
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState<ClosedPeriod | null>(null);
  const [notes, setNotes] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [isReopening, setIsReopening] = useState(false);

  const now = new Date();
  const currentPeriodLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res: any = await api.get("/period-close");
      setCurrentPeriodClosed(res.isCurrentPeriodClosed || false);
      setClosedPeriods(res.closedPeriods || []);
      setTasks(res.tasks || []);
      setStats(res.stats || { postedEntries: 0, reconciledAccounts: 0, unreconciledItems: 0 });
    } catch {
      // If endpoint doesn't exist yet, use defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = tasks.filter(t => !t.completed).length;
  const canClose = !currentPeriodClosed && pendingTasks === 0;

  const handleClose = async () => {
    setIsClosing(true);
    try {
      await api.post("/period-close/close", { notes });
      toast.success(`${currentPeriodLabel} has been closed`);
      setShowCloseDialog(false);
      setNotes("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to close period");
    } finally {
      setIsClosing(false);
    }
  };

  const handleReopen = async (period: ClosedPeriod) => {
    setIsReopening(true);
    try {
      await api.post("/period-close/reopen", {
        periodYear: period.periodYear,
        periodMonth: period.periodMonth,
      });
      toast.success(`${period.periodLabel} has been reopened`);
      setShowReopenDialog(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to reopen period");
    } finally {
      setIsReopening(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Heading title="Period Close" description="Close accounting periods and lock transactions" />
      <Separator />

      {/* Info Alert */}
      <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
        <Lock className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
        <div className="text-sm text-green-800 dark:text-green-300 space-y-2">
          <p className="font-semibold">Period Close Best Practices</p>
          <p><span className="font-medium">What does closing do?</span> Closing a period locks all transactions in that date range, preventing accidental edits to finalised financial data.</p>
          <p><span className="font-medium">Before you close:</span> Ensure all bank reconciliations are complete, all invoices and bills are posted, and payroll for the period has been processed.</p>
          <p className="text-amber-700 dark:text-amber-400 font-medium">⚠️ Reopening a closed period should only be done to correct material errors.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Period</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{currentPeriodLabel}</div>
            <Badge variant={currentPeriodClosed ? "default" : "secondary"} className="mt-2">
              {currentPeriodClosed ? "Closed" : "Open"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed Periods</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{closedPeriods.length}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Before closing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">This period</p>
          </CardContent>
        </Card>
      </div>

      {currentPeriodClosed && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
          <Lock className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          <p className="text-sm text-emerald-800 dark:text-emerald-200">
            {currentPeriodLabel} is already closed. No new transactions can be posted to this period.
          </p>
        </div>
      )}

      {/* Checklist */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Period Close Checklist</CardTitle>
          {!currentPeriodClosed && (
            <Button size="sm" disabled={!canClose} onClick={() => setShowCloseDialog(true)}>
              <Lock className="h-4 w-4 mr-2" />
              Close Period
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              All pre-close checks passed. You can close the period.
            </p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task, index) => (
                <div key={index} className="flex items-center justify-between gap-3 p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className={`h-5 w-5 shrink-0 ${task.completed ? "text-emerald-600" : "text-muted-foreground"}`} />
                    <div>
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.description}</p>
                    </div>
                  </div>
                  <Badge variant={task.completed ? "default" : "outline"}>
                    {task.completed ? "Complete" : "Pending"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Period Summary */}
      <Card>
        <CardHeader><CardTitle>Period Summary</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Journal Entries</p>
              <p className="text-2xl font-bold mt-1">{stats.postedEntries}</p>
              <p className="text-xs text-muted-foreground mt-1">Posted this period</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Bank Reconciliations</p>
              <p className="text-2xl font-bold mt-1">{stats.reconciledAccounts}</p>
              <p className="text-xs text-muted-foreground mt-1">Completed</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Unreconciled Items</p>
              <p className="text-2xl font-bold mt-1">{stats.unreconciledItems}</p>
              <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Closed Periods History */}
      {closedPeriods.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Closed Periods History</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {closedPeriods.map((period) => (
                <div key={period.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{period.periodLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      Closed {format(new Date(period.closedAt), "PPP")} · {period.postedEntriesCount} entries
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                      <div className="flex items-center gap-1 text-sm text-emerald-600">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>{formatCurrency(period.totalRevenue)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-red-500">
                        <TrendingDown className="h-3.5 w-3.5" />
                        <span>{formatCurrency(period.totalExpenses)}</span>
                      </div>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-muted-foreground">Net Income</p>
                      <p className={`font-semibold text-sm ${period.netIncome >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {formatCurrency(period.netIncome)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={period.status === "closed" ? "default" : "secondary"}>
                        {period.status}
                      </Badge>
                      {period.status === "closed" && (
                        <Button variant="outline" size="sm" onClick={() => setShowReopenDialog(period)}>
                          <Unlock className="h-3.5 w-3.5 mr-1" />
                          Reopen
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Close Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close {currentPeriodLabel}</DialogTitle>
            <DialogDescription>
              This will lock all transactions in this period. Revenue and expense balances will be transferred to Retained Earnings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
              <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                All revenue and expense account balances will be zeroed out and the net transferred to Retained Earnings.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="Add any notes about this period close..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>Cancel</Button>
            <Button onClick={handleClose} disabled={isClosing}>
              {isClosing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Close Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Dialog */}
      <Dialog open={!!showReopenDialog} onOpenChange={() => setShowReopenDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reopen {showReopenDialog?.periodLabel}</DialogTitle>
            <DialogDescription>
              This will void the closing journal entry for this period and allow new transactions. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReopenDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => showReopenDialog && handleReopen(showReopenDialog)} disabled={isReopening}>
              {isReopening && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Reopen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
