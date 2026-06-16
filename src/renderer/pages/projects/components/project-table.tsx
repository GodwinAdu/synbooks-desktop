/**
 * Project DataTable component
 */

import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { Project } from "../types";

interface ProjectTableProps {
  projects: Project[];
  onRefresh: () => void;
}

export function ProjectTable({ projects, onRefresh }: ProjectTableProps) {
  const navigate = useNavigate();

  if (projects.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">All Projects ({projects.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-semibold">Project</th>
                <th className="text-left py-3 px-4 font-semibold">Status</th>
                <th className="text-right py-3 px-4 font-semibold">Budget</th>
                <th className="text-right py-3 px-4 font-semibold">Spent</th>
                <th className="text-right py-3 px-4 font-semibold">Progress</th>
                <th className="text-left py-3 px-4 font-semibold">Dates</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="border-b hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      {project.color && <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: project.color }} />}
                      <div>
                        <p className="font-medium">{project.name}</p>
                        {project.projectNumber && <p className="text-xs text-muted-foreground">{project.projectNumber}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-4">
                    <Badge className={`text-xs capitalize ${getStatusClass(project.status)}`}>
                      {project.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums">
                    {project.budget > 0 ? formatCurrency(project.budget) : "—"}
                  </td>
                  <td className="py-2.5 px-4 text-right tabular-nums">
                    <span className={project.budget > 0 && project.actualCost > project.budget ? "text-red-600 font-medium" : ""}>
                      {project.actualCost > 0 ? formatCurrency(project.actualCost) : "—"}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${project.completionPercentage || 0}%` }} />
                      </div>
                      <span className="text-xs font-medium w-8 text-right">{project.completionPercentage || 0}%</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-xs text-muted-foreground">
                    {project.startDate ? new Date(project.startDate).toLocaleDateString("en-GH", { day: "numeric", month: "short" }) : "—"}
                    {project.endDate ? ` → ${new Date(project.endDate).toLocaleDateString("en-GH", { day: "numeric", month: "short" })}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function getStatusClass(status: string): string {
  switch (status) {
    case "active": return "bg-emerald-100 text-emerald-700";
    case "planning": return "bg-blue-100 text-blue-700";
    case "on_hold": return "bg-yellow-100 text-yellow-700";
    case "completed": return "bg-gray-100 text-gray-700";
    case "cancelled": return "bg-red-100 text-red-700";
    default: return "";
  }
}
