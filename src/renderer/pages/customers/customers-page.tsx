import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CustomerTable } from "./components/customer-table";
import { CustomerCreateForm } from "./components/customer-create-form";

export function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create">("list");

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/customers", { pageSize: 50 })
      .then((res: any) => setCustomers(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (view === "create") {
    return <CustomerCreateForm onBack={() => { setView("list"); load(); }} />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Heading title="Customers" description="Manage your customer records" />
        <Button onClick={() => setView("create")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>
      <Separator />
      <CustomerTable customers={customers} loading={loading} onRefresh={load} />
    </div>
  );
}
