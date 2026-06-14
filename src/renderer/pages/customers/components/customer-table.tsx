/**
 * Customer Table
 * Uses the shared DataTable component with TanStack React Table for sorting, search, and pagination.
 */

import { DataTable } from "@/components/table";
import { Users } from "lucide-react";
import { getCustomerColumns, type Customer } from "./customer-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface Props {
  customers: Customer[];
  loading: boolean;
  onRefresh: () => void;
}

export function CustomerTable({ customers, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const columns = getCustomerColumns({
    onView: (customer) => console.log("View customer", customer.id),
    onEdit: (customer) => console.log("Edit customer", customer.id),
    onDelete: async (customer) => {
      try {
        await api.delete(`/customers/${customer.id}`);
        toast.success("Customer deleted");
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to delete customer");
      }
    },
  });

  return (
    <DataTable
      columns={columns}
      data={customers}
      searchKey="name"
      searchPlaceholder="Search customers..."
      pageSize={20}
      emptyMessage="No customers found. Add your first customer to get started."
      emptyIcon={<Users className="size-10 text-muted-foreground/50 mb-2" />}
    />
  );
}
