import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { BillTable } from "./components/bill-table";
import { BillCreateForm } from "./components/bill-create-form";

export function BillsPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create">("list");

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/bills", { pageSize: 50 })
      .then((res: any) => setBills(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (view === "create") {
    return <BillCreateForm onBack={() => { setView("list"); load(); }} />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Heading title="Bills" description="Manage vendor bills and payments" />
        <Button onClick={() => setView("create")}>
          <Plus className="h-4 w-4 mr-2" />
          New Bill
        </Button>
      </div>
      <Separator />
      <BillTable bills={bills} loading={loading} onRefresh={load} />
    </div>
  );
}
