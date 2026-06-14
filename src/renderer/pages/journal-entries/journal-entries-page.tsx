import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, Plus } from "lucide-react";
import { JournalEntryTable } from "./components/journal-entry-table";
import { JournalEntryCreate } from "./components/journal-entry-create";
import { JournalEntryDetail } from "./components/journal-entry-detail";
import type { JournalEntry } from "./types";

type View = "list" | "create" | "detail";

export function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "posted">("all");

  const fetchEntries = () => {
    setLoading(true);
    api
      .get("/journal-entries", { pageSize: 100 })
      .then((res: any) => setEntries(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handlePost = async (id: string) => {
    try {
      await api.post(`/journal-entries/${id}/post`);
      toast.success("Journal entry posted successfully");
      fetchEntries();
    } catch (error: any) {
      toast.error(error.message || "Failed to post entry");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/journal-entries/${id}`);
      toast.success("Journal entry deleted");
      fetchEntries();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete entry");
    }
  };

  const handleViewEntry = (id: string) => {
    setSelectedEntryId(id);
    setView("detail");
  };

  const handleBack = () => {
    setView("list");
    setSelectedEntryId(null);
    fetchEntries();
  };

  // Show create view
  if (view === "create") {
    return <JournalEntryCreate onBack={handleBack} />;
  }

  // Show detail view
  if (view === "detail" && selectedEntryId) {
    return <JournalEntryDetail entryId={selectedEntryId} onBack={handleBack} />;
  }

  const totalEntries = entries.length;
  const postedCount = entries.filter((e) => e.status === "posted").length;
  const draftCount = entries.filter((e) => e.status === "draft").length;

  const filteredEntries =
    statusFilter === "all"
      ? entries
      : entries.filter((e) => e.status === statusFilter);

  return (
    <div className="p-6 space-y-6">
      <Heading
        title={`Journal Entries (${totalEntries})`}
        description="Record and manage accounting journal entries"
      />
      <Separator />

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEntries}</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 dark:bg-emerald-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Posted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{postedCount}</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Draft
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{draftCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Info Alert */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
        <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-medium mb-1">About Journal Entries</p>
          <p>
            Journal entries record financial transactions using double-entry bookkeeping.{" "}
            <span className="font-medium">Draft</span> entries can be edited or deleted.{" "}
            <span className="font-medium">Posted</span> entries are permanent and affect account balances.{" "}
            Total debits must always equal total credits for each entry.
          </p>
        </div>
      </div>

      {/* Actions + Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            All
          </Button>
          <Button
            variant={statusFilter === "draft" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("draft")}
          >
            Draft
          </Button>
          <Button
            variant={statusFilter === "posted" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("posted")}
          >
            Posted
          </Button>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => setView("create")}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Entry
        </Button>
      </div>

      {/* Table */}
      <JournalEntryTable
        entries={filteredEntries}
        loading={loading}
        onPost={handlePost}
        onDelete={handleDelete}
        onView={handleViewEntry}
      />
    </div>
  );
}
