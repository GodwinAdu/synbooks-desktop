import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { VendorTable } from "./components/vendor-table";
import { VendorCreateForm } from "./components/vendor-create-form";

export function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create">("list");

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/vendors", { pageSize: 50 })
      .then((res: any) => setVendors(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  if (view === "create") {
    return <VendorCreateForm onBack={() => { setView("list"); load(); }} />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Heading title="Vendors" description="Manage your vendor records" />
        <Button onClick={() => setView("create")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Vendor
        </Button>
      </div>
      <Separator />
      <VendorTable vendors={vendors} loading={loading} onRefresh={load} />
    </div>
  );
}
