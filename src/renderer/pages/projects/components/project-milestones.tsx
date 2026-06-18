/**
 * Project Milestones Tab
 * Create, complete, and manage project milestones.
 * Matches the Next.js milestone management (linked to tasks, auto-completion tracking).
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus, Trash2, CheckCircle2, Circle, Clock, Flag, Calendar, DollarSign,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Milestone {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  completedDate?: string;
  status: "pending" | "in_progress" | "completed" | "overdue";
  amount: number;
  invoiced: boolean;
}

interface ProjectMilestonesProps {
  projectId: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Circle; class: string }> = {
  pending: { label: "Pending", icon: Circle, class: "bg-gray-100 text-gray-700" },
  in_progress: { label: "In Progress", icon: Clock, class: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", icon: CheckCircle2, class: "bg-emerald-100 text-emerald-700" },
  overdue: { label: "Overdue", icon: Clock, class: "bg-red-100 text-red-700" },
};

export function ProjectMilestones({ projectId }: ProjectMilestonesProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [form, setForm] = useState({ title: "", description: "", dueDate: "", amount: "" });

  const fetchMilestones = () => {
    setLoading(true);
    api.get(`/projects/${projectId}/milestones`)
      .then((res: any) => {
        let data = res.data || [];
        // Check overdue status
        const today = new Date().toISOString().split("T")[0];
        data = data.map((m: any) => {
          if (m.status !== "completed" && m.dueDate && m.dueDate < today) {
            return { ...m, status: "overdue" };
          }
          return m;
        });
        setMilestones(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMilestones(); }, [projectId]);

  const handleAdd = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSubmitting(true);
    try {
      await api.post(`/projects/${projectId}/milestones`, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        dueDate: form.dueDate || undefined,
        amount: form.amount ? parseFloat(form.amount) : 0,
      });
      toast.success("Milestone added");
      setShowAdd(false);
      setForm({ title: "", description: "", dueDate: "", amount: "" });
      fetchMilestones();
    } catch (e: any) {
      toast.error(e.message || "Failed to add milestone");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (milestone: Milestone, newStatus: string) => {
    try {
      await api.put(`/projects/${projectId}/milestones/${milestone.id}`, { status: newStatus });
      toast.success(`Milestone ${newStatus === "completed" ? "completed" : "updated"}`);
      fetchMilestones();
    } catch (e: any) {
      toast.error(e.message || "Failed to update milestone");
    }
  };

  const handleDelete = async (milestoneId: string) => {
    try {
      await api.delete(`/projects/${projectId}/milestones/${milestoneId}`);
      toast.success("Milestone deleted");
      fetchMilestones();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete milestone");
    }
  };

  // Summary
  const completedCount = milestones.filter((m) => m.status === "completed").length;
  const totalAmount = milestones.reduce((s, m) => s + (m.amount || 0), 0);
  const completedAmount = milestones.filter((m) => m.status === "completed").reduce((s, m) => s + (m.amount || 0), 0);
  const progress = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Milestones ({milestones.length})</span>
          {milestones.length > 0 && (
            <Badge className="text-[10px] bg-emerald-100 text-emerald-700">{progress}% complete</Badge>
          )}
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Milestone
        </Button>
      </div>

      {/* Summary Cards */}
      {milestones.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Progress</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs font-bold">{completedCount}/{milestones.length}</span>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="text-sm font-bold mt-1">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-xs text-muted-foreground">Completed Value</p>
            <p className="text-sm font-bold text-emerald-600 mt-1">{formatCurrency(completedAmount)}</p>
          </div>
        </div>
      )}

      {/* Milestones List */}
      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
      ) : milestones.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Flag className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-3" />
              <p className="text-sm text-muted-foreground">No milestones yet</p>
              <p className="text-xs text-muted-foreground mt-1">Break the project into milestones to track progress and billing</p>
              <Button size="sm" className="mt-3" onClick={() => setShowAdd(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add First Milestone
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {milestones.map((milestone) => {
            const config = STATUS_CONFIG[milestone.status] || STATUS_CONFIG.pending;
            const Icon = config.icon;
            const isOverdue = milestone.status !== "completed" && milestone.dueDate && milestone.dueDate < new Date().toISOString().split("T")[0];
            return (
              <Card key={milestone.id} className={isOverdue ? "border-red-200" : ""}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        className="mt-0.5 shrink-0"
                        onClick={() => {
                          if (milestone.status === "pending") handleStatusChange(milestone, "in_progress");
                          else if (milestone.status === "in_progress" || milestone.status === "overdue") handleStatusChange(milestone, "completed");
                          else handleStatusChange(milestone, "pending");
                        }}
                        title="Toggle status"
                      >
                        <Icon className={`h-5 w-5 ${milestone.status === "completed" ? "text-emerald-600" : milestone.status === "in_progress" ? "text-blue-600" : isOverdue ? "text-red-600" : "text-gray-400"}`} />
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium ${milestone.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                            {milestone.title}
                          </p>
                          <Badge className={`text-[10px] ${config.class}`}>{config.label}</Badge>
                        </div>
                        {milestone.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{milestone.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          {milestone.dueDate && (
                            <span className={`flex items-center gap-1 ${isOverdue ? "text-red-600 font-medium" : ""}`}>
                              <Calendar className="h-3 w-3" />
                              {new Date(milestone.dueDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          )}
                          {milestone.amount > 0 && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(milestone.amount)}
                            </span>
                          )}
                          {milestone.completedDate && (
                            <span className="text-emerald-600">
                              Completed {new Date(milestone.completedDate).toLocaleDateString("en-GH", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-red-600 shrink-0"
                      onClick={() => handleDelete(milestone.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Milestone Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Milestone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Design Phase Complete"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Milestone description..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (GHS)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                />
                <p className="text-[10px] text-muted-foreground">Billable amount for this milestone</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={submitting || !form.title.trim()}>
              {submitting ? "Adding..." : "Add Milestone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
