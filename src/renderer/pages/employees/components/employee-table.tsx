/**
 * Employee Table
 * Uses the shared DataTable component with TanStack React Table for sorting, search, and pagination.
 */

import { DataTable } from "@/components/table";
import { UserCheck } from "lucide-react";
import { getEmployeeColumns, type Employee } from "./employee-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface Props {
  employees: Employee[];
  loading: boolean;
  onRefresh: () => void;
}

export function EmployeeTable({ employees, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const columns = getEmployeeColumns({
    onView: (employee) => console.log("View employee", employee.id),
    onEdit: (employee) => console.log("Edit employee", employee.id),
    onTerminate: async (employee) => {
      try {
        await api.post(`/employees/${employee.id}/terminate`);
        toast.success("Employee terminated");
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to terminate employee");
      }
    },
  });

  return (
    <DataTable
      columns={columns}
      data={employees}
      searchKey="name"
      searchPlaceholder="Search employees..."
      pageSize={20}
      emptyMessage="No employees found. Add your first employee to get started."
      emptyIcon={<UserCheck className="size-10 text-muted-foreground/50 mb-2" />}
    />
  );
}
