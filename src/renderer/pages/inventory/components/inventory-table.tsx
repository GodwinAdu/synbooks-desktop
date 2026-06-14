import { DataTable } from "@/components/table";
import { Warehouse } from "lucide-react";
import { getInventoryColumns, type InventoryProduct } from "./inventory-columns";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  products: InventoryProduct[];
  loading: boolean;
}

export function InventoryTable({ products, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const columns = getInventoryColumns();

  return (
    <DataTable
      columns={columns}
      data={products}
      searchKey="name"
      searchPlaceholder="Search inventory by product name..."
      pageSize={20}
      emptyMessage="No tracked inventory products found."
      emptyIcon={<Warehouse className="size-10 text-muted-foreground/50 mb-2" />}
    />
  );
}
