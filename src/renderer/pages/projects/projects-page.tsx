/**
 * Projects Page
 * Dashboard view matching the Next.js app with stats, charts, and project list.
 */

import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import {
  Briefcase, DollarSign, TrendingUp, Target, Plus, AlertTriangle,
  ArrowRight, Clock,
} from "lucide-react";
import { CreateProjectDialog } from "./components/create-project-dialog";
import { ProjectTable } from "./components/project-table";
import type { Project, STATUS_COLORS, STATUS_BG } from "./types";

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchProjects = () => {
    setLoading(true);
    api.get("/projects", { pageSize: 100 })
      .then((res: any) => setProjects(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, []);

  const summary = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === "active").length;
    const totalBudget = projects.reduce((s, p) => s + (p.budget || 0), 0);
    const totalCost = projects.reduce((s, p) => s + (p.actualCost || 0), 0);
    const totalRevenue = projects.reduce((s, p) => s + (p.revenue || 0), 0);
    const avgCompletion = total > 0 ? Math.round(projects.reduce((s, p) => s + (p.completionPercentage || 0), 0) / total) : 0;
    return { total, active, totalBudget, totalCost, totalRevenue, totalProfit: totalRevenue - totalCost, avgCompletion };
  }, [projects]);

  const atRisk = useMemo(() => {
    return projects.filter((p) => {
      if (p.status === "completed" || p.status === "cancelled") return false;
      const overBudget = p.budget > 0 && p.actualCost > p.budget;
      const overdue = p.endDate && new Date(p.endDate) < new Date();
      return overBudget || overdue;
    });
  }, [projects]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Heading title="Projects Overview" description="Dashboard for all project activity, budgets, and profitability." />
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Project
        </Button>
      </div>
      <Separator />

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <>
          {/* Top Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <StatCard label="Total" value={String(summary.total)} sub={`${summary.active} active`} icon={Briefcase} color="text-blue-600" bg="bg-blue-50" />
            <StatCard label="Budget" value={formatCurrency(summary.totalBudget)} icon={DollarSign} color="text-muted-foreground" bg="bg-gray-50" />
            <StatCard label="Cost" value={formatCurrency(summary.totalCost)} icon={TrendingUp} color="text-orange-600" bg="bg-orange-50" />
            <StatCard label="Revenue" value={formatCurrency(summary.totalRevenue)} icon={DollarSign} color="text-emerald-600" bg="bg-emerald-50" />
            <StatCard label="Profit" value={formatCurrency(summary.totalProfit)} icon={TrendingUp} color={summary.totalProfit >= 0 ? "text-emerald-600" : "text-red-600"} bg={summary.totalProfit >= 0 ? "bg-emerald-50" : "bg-red-50"} />
            <StatCard label="Avg Completion" value={`${summary.avgCompletion}%`} icon={Target} color="text-purple-600" bg="bg-purple-50" />
          </div>

          {/* At Risk + Recent */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" /> At Risk ({atRisk.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {atRisk.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No at-risk projects 🎉</p>
                ) : (
                  <div className="space-y-2">
                    {atRisk.slice(0, 5).map((p) => {
                      const overBudget = p.budget > 0 && p.actualCost > p.budget;
                      const overdue = p.endDate && new Date(p.endDate) < new Date();
                      return (
                        <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <div className="flex gap-1.5 mt-1">
                              {overBudget && <Badge className="text-[10px] bg-red-100 text-red-700">Over Budget</Badge>}
                              {overdue && <Badge className="text-[10px] bg-amber-100 text-amber-700">Overdue</Badge>}
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" /> Recent Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-3" />
                    <p className="text-sm text-muted-foreground">No projects yet</p>
                    <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}>Create First Project</Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {projects.slice(0, 5).map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          {p.color && <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.projectNumber || "—"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1.5 min-w-[80px]">
                            <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${p.completionPercentage || 0}%` }} />
                            </div>
                            <span className="text-[10px] font-medium w-7 text-right">{p.completionPercentage || 0}%</span>
                          </div>
                          <Badge className={`text-[10px] ${p.status === "active" ? "bg-emerald-100 text-emerald-700" : p.status === "planning" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
                            {p.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Full Project Table */}
          <ProjectTable projects={projects} onRefresh={fetchProjects} />
        </>
      )}

      <CreateProjectDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchProjects} />
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color, bg }: { label: string; value: string; sub?: string; icon: any; color: string; bg: string }) {
  return (
    <Card className="border-0 ring-1 ring-border/50">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2">
          <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
            <p className="text-base font-bold leading-tight">{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
