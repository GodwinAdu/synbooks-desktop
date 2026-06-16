/**
 * Project Detail View
 * Shows project header with tabs: Overview, Tasks, Financials
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Calendar, User, Building2, DollarSign } from "lucide-react";
import { ProjectTasks } from "./project-tasks";
import { ProjectFinancials } from "./project-financials";
import { STATUS_BG } from "../types";
import type { Project } from "../types";

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/projects/${id}`)
      .then((res: any) => {
        const p = res.data || res;
        setProject({
          ...p,
          actualCost: p.spent ?? p.actualCost ?? 0,
          completionPercentage: p.progress ?? p.completionPercentage ?? 0,
          revenue: p.revenue ?? 0,
        });
      })
      .catch(() => navigate("/projects"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) return null;

  const budgetUsed = project.budget > 0 ? Math.round((project.actualCost / project.budget) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {project.color && <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: project.color }} />}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold truncate">{project.name}</h1>
              <Badge className={STATUS_BG[project.status] || "bg-gray-100 text-gray-700"}>
                {project.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{project.projectNumber || "No project number"}</p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden max-w-md">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${project.completionPercentage || 0}%` }} />
        </div>
        <span className="text-sm font-medium">{project.completionPercentage || 0}% complete</span>
        {project.budget > 0 && (
          <span className="text-sm text-muted-foreground ml-4">
            Budget: {formatCurrency(project.actualCost)} / {formatCurrency(project.budget)} ({budgetUsed}%)
          </span>
        )}
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <OverviewTab project={project} />
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <ProjectTasks projectId={project.id} />
        </TabsContent>

        <TabsContent value="financials" className="mt-4">
          <ProjectFinancials projectId={project.id} projectName={project.name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab({ project }: { project: Project }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {project.description && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{project.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Start Date</p>
                <p className="text-sm">{project.startDate ? new Date(project.startDate).toLocaleDateString() : "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">End Date</p>
                <p className="text-sm">{project.endDate ? new Date(project.endDate).toLocaleDateString() : "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Manager</p>
                <p className="text-sm">{project.managerName || "Unassigned"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Client</p>
                <p className="text-sm">{project.customerName || "No client"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Budget & Financials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Budget</p>
              <p className="text-lg font-bold">{formatCurrency(project.budget || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Spent</p>
              <p className={`text-lg font-bold ${project.budget > 0 && project.actualCost > project.budget ? "text-red-600" : ""}`}>
                {formatCurrency(project.actualCost || 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(project.revenue || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Profit</p>
              <p className={`text-lg font-bold ${(project.revenue - project.actualCost) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {formatCurrency(project.revenue - project.actualCost)}
              </p>
            </div>
          </div>
          {project.budget > 0 && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Budget Usage</span>
                <span>{Math.round((project.actualCost / project.budget) * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${project.actualCost > project.budget ? "bg-red-500" : "bg-primary"}`}
                  style={{ width: `${Math.min(100, (project.actualCost / project.budget) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
