import { type ColumnDef } from "@tanstack/react-table";
import { formatCurrency } from "@/lib/utils";

export interface InventoryProduct {
  id: string;
  sku?: string;
  name: string;
  currentStock: number;
  reorderLevel: number;
  unit: string;
  costPrice: number;
}

export function getInventoryColumns(): ColumnDef<InventoryProduct>[] {
  return [
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("sku") || "—"}</span>,
    },
    {
      accessorKey: "name",
      header: "Product Name",
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      accessorKey: "currentStock",
      header: () => <div className="text-right">Current Stock</div>,
      cell: ({ row }) => {
        const stock = row.original.currentStock;
        const reorderLevel = row.original.reorderLevel;
        const isLow = stock <= reorderLevel;
        return (
          <div className={`text-right font-medium ${isLow ? "text-red-600" : ""}`}>
            {stock}
          </div>
        );
      },
    },
    {
      accessorKey: "reorderLevel",
      header: () => <div className="text-right">Reorder Level</div>,
      cell: ({ row }) => <div className="text-right">{row.getValue("reorderLevel")}</div>,
    },
    {
      accessorKey: "unit",
      header: "Unit",
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("unit") || "pcs"}</span>,
    },
    {
      id: "value",
      header: () => <div className="text-right">Value</div>,
      cell: ({ row }) => {
        const value = row.original.currentStock * row.original.costPrice;
        return <div className="text-right font-medium">{formatCurrency(value)}</div>;
      },
    },
  ];
}
