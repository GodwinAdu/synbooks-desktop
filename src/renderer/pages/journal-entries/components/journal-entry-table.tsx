import { DataTable } from "@/components/table";
import { BookMarked } from "lucide-react";
import { getJournalEntryColumns } from "./journal-entry-columns";
import { Skeleton } from "@/components/ui/skeleton";
import type { JournalEntry } from "../types";

interface Props {
  entries: JournalEntry[];
  loading: boolean;
  onPost: (id: string) => void;
  onDelete: (id: string) => void;
  onView: (id: string) => void;
}

export function JournalEntryTable({ entries, loading, onPost, onDelete, onView }: Props) {
  if (loading) {
    return <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  const columns = getJournalEntryColumns({
    onView: (entry) => onView(entry.id),
    onPost: (entry) => onPost(entry.id),
    onDelete: (entry) => onDelete(entry.id),
  });

  return (
    <DataTable
      columns={columns}
      data={entries}
      searchKey="entryNumber"
      searchPlaceholder="Search by entry number or description..."
      pageSize={20}
      emptyMessage="No journal entries found. Create your first entry to get started."
      emptyIcon={<BookMarked className="size-10 text-muted-foreground/50 mb-2" />}
    />
  );
}
