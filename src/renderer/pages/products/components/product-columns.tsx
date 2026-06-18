import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2, PackagePlus, Power, Layers, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface Product {
  id: string;
  sku?: string;
  name: string;
  type?: "product" | "service" | "bundle" | "raw_material" | "finished_good";
  price: number;
  sellingPrice?: number;
  costPrice?: number;
  stock?: number;
  currentStock?: number;
  reorderLevel?: number;
  status?: "active" | "inactive" | "discontinued";
  trackInventory?: boolean;
  hasVariants?: boolean;
  variants?: any[];
}

const typeConfig: Record<string, { label: string; className: string }> = {
  product: { label: "Product", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  service: { label: "Service", className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  bundle: { label: "Bundle", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  raw_material: { label: "Raw Material", className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
  finished_good: { label: "Finished Good", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "border-emerald-600 text-emerald-600" },
  inactive: { label: "Inactive", className: "border-gray-400 text-gray-500" },
  discontinued: { label: "Discontinued", className: "border-red-600 text-red-600" },
};

export function getProductColumns(actions: {
  onView?: (product: Product) => void;
  onEdit?: (product: Product) => void;
  onAdjustStock?: (product: Product) => void;
  onToggleStatus?: (product: Product) => void;
  onDelete?: (product: Product) => void;
}): ColumnDef<Product>[] {
  return [
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("sku") || "—"}</span>,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const hasVariants = row.original.hasVariants;
        const isBundle = row.original.type === "bundle";
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.getValue("name")}</span>
            {hasVariants && (
              <Badge variant="outline" className="text-xs">
                <Layers className="h-3 w-3 mr-1" />
                {row.original.variants?.length || 0}
              </Badge>
            )}
            {isBundle && (
              <Badge variant="outline" className="text-xs">
                <Package className="h-3 w-3 mr-1" />
                Bundle
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = (row.getValue("type") as string) || "product";
        const cfg = typeConfig[type] || typeConfig.product;
        return <Badge className={cfg.className}>{cfg.label}</Badge>;
      },
    },
    {
      accessorKey: "sellingPrice",
      header: () => <div className="text-right">Price</div>,
      cell: ({ row }) => {
        const price = row.original.sellingPrice ?? row.original.price;
        return <div className="text-right font-medium">{formatCurrency(price)}</div>;
      },
    },
    {
      accessorKey: "costPrice",
      header: () => <div className="text-right">Cost</div>,
      cell: ({ row }) => {
        const cost = row.original.costPrice ?? 0;
        return <div className="text-right text-muted-foreground">{formatCurrency(cost)}</div>;
      },
    },
    {
      id: "stock",
      header: () => <div className="text-right">Stock</div>,
      cell: ({ row }) => {
        const stock = row.original.currentStock ?? row.original.stock;
        const reorderLevel = row.original.reorderLevel || 0;
        const isLow = stock != null && stock > 0 && stock <= reorderLevel;
        const isOut = stock != null && stock <= 0;
        return (
          <div className={`text-right font-medium ${isOut ? "text-red-600" : isLow ? "text-amber-600" : ""}`}>
            {stock ?? "—"}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = (row.original.status as string) || "active";
        const cfg = statusConfig[status] || statusConfig.active;
        return <Badge variant="outline" className={cfg.className}>{cfg.label}</Badge>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const product = row.original;
        const isActive = (product.status || "active") === "active";
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => actions.onView?.(product)}>
                <Eye className="h-4 w-4 mr-2" />View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onEdit?.(product)}>
                <Edit className="h-4 w-4 mr-2" />Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onAdjustStock?.(product)}>
                <PackagePlus className="h-4 w-4 mr-2" />Adjust Stock
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => actions.onToggleStatus?.(product)}>
                <Power className="h-4 w-4 mr-2" />
                {isActive ? "Deactivate" : "Activate"}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600" onClick={() => actions.onDelete?.(product)}>
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
