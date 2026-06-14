import { DataTable } from "@/components/table";
import { BookOpenCheck } from "lucide-react";
import { getGLColumns } from "./gl-columns";
import { Skeleton } from "@/components/ui/skeleton";
import type { GLTransaction } from "../types";

interface Props {
  transactions: GLTransaction[];
  loading: boolean;
}

export function GLTable({ transactions, loading }: Props) {
  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  const columns = getGLColumns();

  return (
    <DataTable
      columns={columns}
      data={transactions}
      searchKey="description"
      searchPlaceholder="Search by description, account, or reference..."
      pageSize={30}
      emptyMessage="No transactions found. Post journal entries to see them in the general ledger."
      emptyIcon={<BookOpenCheck className="size-10 text-muted-foreground/50 mb-2" />}
    />
  );
}
