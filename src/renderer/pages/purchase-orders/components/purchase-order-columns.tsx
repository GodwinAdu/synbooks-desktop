import { type ColumnDef } from "@tanstack/react-table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { PurchaseOrder } from "../types";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  received: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

export const purchaseOrderColumns: ColumnDef<PurchaseOrder>[] = [
  {
    accessorKey: "poNumber",
    header: "PO #",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.poNumber || "—"}</span>
    ),
  },
  {
    accessorKey: "vendorName",
    header: "Vendor",
    cell: ({ row }) => row.original.vendorName || "—",
  },
  {
    accessorKey: "orderDate",
    header: "Order Date",
    cell: ({ row }) => formatDate(row.original.orderDate),
  },
  {
    accessorKey: "expectedDate",
    header: "Expected Date",
    cell: ({ row }) => row.original.expectedDate ? formatDate(row.original.expectedDate) : "—",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant="secondary" className={statusColors[row.original.status] || ""}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "totalAmount",
    header: "Total",
    cell: ({ row }) => (
      <span className="font-medium">{formatCurrency(row.original.totalAmount)}</span>
    ),
  },
];
