import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { PayrollTable } from "./components/payroll-table";
import { PayrollRunForm } from "./components/payroll-run-form";
import { Plus } from "lucide-react";

type ViewState = "list" | "run";

export function PayrollPage() {
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewState>("list");

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/payroll", { pageSize: 50 })
      .then((res: any) => setPayrolls(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (view === "run") {
    return (
      <PayrollRunForm
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
        <Heading title="Payroll" description="Manage payroll runs and payments" />
        <Button
          onClick={() => setView("run")}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Run Payroll
        </Button>
      </div>
      <Separator />
      <PayrollTable payrolls={payrolls} loading={loading} onRefresh={load} />
    </div>
  );
}
