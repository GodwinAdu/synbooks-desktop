import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { EmployeeTable } from "./components/employee-table";
import { EmployeeCreateForm } from "./components/employee-create-form";
import { Plus } from "lucide-react";

type ViewState = "list" | "create";

export function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewState>("list");

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/employees", { pageSize: 50 })
      .then((res: any) => setEmployees(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (view === "create") {
    return (
      <EmployeeCreateForm
        onCancel={() => setView("list")}
        onSaved={() => {
          setView("list");
          load();
        }}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Heading title="Employees" description="Manage your employee records" />
        <Button
          onClick={() => setView("create")}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>
      <Separator />
      <EmployeeTable employees={employees} loading={loading} onRefresh={load} />
    </div>
  );
}
