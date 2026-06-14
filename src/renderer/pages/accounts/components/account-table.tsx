/**
 * Account Table
 * Uses the shared DataTable component with TanStack React Table for sorting, search, and pagination.
 */

import { DataTable } from "@/components/table";
import { BookOpen } from "lucide-react";
import { getAccountColumns } from "./account-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import type { Account } from "../types";

interface Props {
  accounts: Account[];
  loading: boolean;
  onEdit?: (account: Account) => void;
  onRefresh?: () => void;
}

export function AccountTable({ accounts, loading, onEdit, onRefresh }: Props) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const columns = getAccountColumns({
    onEdit: onEdit,
    onViewLedger: (account) => navigate(`/general-ledger?account=${account.id}`),
    onDelete: async (account) => {
      try {
        await api.delete(`/accounts/${account.id}`);
        toast.success(`Account "${account.accountName}" deleted`);
        onRefresh?.();
      } catch (e: any) {
        toast.error(e.message || "Failed to delete account");
      }
    },
  });

  return (
    <DataTable
      columns={columns}
      data={accounts}
      searchKey="accountName"
      searchPlaceholder="Search by name or code..."
      pageSize={50}
      emptyMessage="No accounts found. Add your first account to get started."
      emptyIcon={<BookOpen className="size-10 text-muted-foreground/50 mb-2" />}
    />
  );
}
