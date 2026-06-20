/**
 * Vendor Table
 * Uses the shared DataTable component with TanStack React Table for sorting, search, and pagination.
 */

import { useState } from "react";
import { DataTable } from "@/components/table";
import { Store } from "lucide-react";
import { getVendorColumns, type Vendor } from "./vendor-columns";
import { VendorDetail } from "./vendor-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface Props {
  vendors: Vendor[];
  loading: boolean;
  onRefresh: () => void;
}

export function VendorTable({ vendors, loading, onRefresh }: Props) {
  const [viewVendor, setViewVendor] = useState<Vendor | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const columns = getVendorColumns({
    onView: (vendor) => setViewVendor(vendor),
    onEdit: (vendor) => console.log("Edit vendor", vendor.id),
    onDelete: async (vendor) => {
      try {
        await api.delete(`/vendors/${vendor.id}`);
        toast.success("Vendor deleted");
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to delete vendor");
      }
    },
  });

  return (
    <>
      <DataTable
        columns={columns}
        data={vendors}
        searchKey="name"
        searchPlaceholder="Search vendors..."
        pageSize={20}
        emptyMessage="No vendors found. Add your first vendor to get started."
        emptyIcon={<Store className="size-10 text-muted-foreground/50 mb-2" />}
      />
      <VendorDetail open={!!viewVendor} onClose={() => setViewVendor(null)} vendor={viewVendor} />
    </>
  );
}
