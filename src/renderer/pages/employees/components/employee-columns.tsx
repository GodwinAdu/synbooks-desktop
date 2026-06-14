import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, UserX } from "lucide-react";

export interface Employee {
  id: string;
  employeeNumber?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  position?: string;
  employmentType?: "full-time" | "part-time" | "contract" | "intern";
  status: "active" | "inactive" | "terminated";
}

const employmentTypeConfig: Record<string, { label: string; className: string }> = {
  "full-time": { label: "Full-time", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  "part-time": { label: "Part-time", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  contract: { label: "Contract", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  intern: { label: "Intern", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  inactive: { label: "Inactive", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  terminated: { label: "Terminated", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

export function getEmployeeColumns(actions: {
  onView?: (employee: Employee) => void;
  onEdit?: (employee: Employee) => void;
  onTerminate?: (employee: Employee) => void;
}): ColumnDef<Employee>[] {
  return [
    {
      accessorKey: "employeeNumber",
      header: "Employee #",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.employeeNumber || row.original.id}</span>
      ),
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const name = row.original.name || `${row.original.firstName || ""} ${row.original.lastName || ""}`.trim();
        return <span className="font-medium">{name || "—"}</span>;
      },
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("department") || "—"}</span>,
    },
    {
      accessorKey: "position",
      header: "Position",
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("position") || "—"}</span>,
    },
    {
      accessorKey: "employmentType",
      header: "Employment Type",
      cell: ({ row }) => {
        const type = (row.getValue("employmentType") as string) || "full-time";
        const cfg = employmentTypeConfig[type] || employmentTypeConfig["full-time"];
        return <Badge className={cfg.className}>{cfg.label}</Badge>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const cfg = statusConfig[status] || statusConfig.active;
        return <Badge className={cfg.className}>{cfg.label}</Badge>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const employee = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => actions.onView?.(employee)}>
                <Eye className="h-4 w-4 mr-2" />View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onEdit?.(employee)}>
                <Edit className="h-4 w-4 mr-2" />Edit
              </DropdownMenuItem>
              {employee.status === "active" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600" onClick={() => actions.onTerminate?.(employee)}>
                    <UserX className="h-4 w-4 mr-2" />Terminate
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
