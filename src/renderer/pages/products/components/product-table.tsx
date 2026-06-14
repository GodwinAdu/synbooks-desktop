/**
 * Product Table
 * Uses the shared DataTable component with TanStack React Table for sorting, search, and pagination.
 */

import { DataTable } from "@/components/table";
import { Package } from "lucide-react";
import { getProductColumns, type Product } from "./product-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface Props {
  products: Product[];
  loading: boolean;
  onRefresh: () => void;
  onView?: (product: Product) => void;
  onEdit?: (product: Product) => void;
}

export function ProductTable({ products, loading, onRefresh, onView, onEdit }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const columns = getProductColumns({
    onView: (product) => onView?.(product),
    onEdit: (product) => onEdit?.(product),
    onAdjustStock: (product) => console.log("Adjust stock", product.id),
    onDelete: async (product) => {
      try {
        await api.delete(`/products/${product.id}`);
        toast.success("Product deleted");
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to delete product");
      }
    },
  });

  return (
    <DataTable
      columns={columns}
      data={products}
      searchKey="name"
      searchPlaceholder="Search products by name..."
      pageSize={20}
      emptyMessage="No products found. Add your first product or service to get started."
      emptyIcon={<Package className="size-10 text-muted-foreground/50 mb-2" />}
    />
  );
}
