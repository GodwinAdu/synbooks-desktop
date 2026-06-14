import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, Plus } from "lucide-react";
import { RecurringJournalTable } from "./components/recurring-journal-table";
import { RecurringJournalCreate } from "./components/recurring-journal-create";
import type { RecurringJournal } from "./types";

type View = "list" | "create";

export function RecurringJournalsPage() {
  const [journals, setJournals] = useState<RecurringJournal[]>([]);
  const [view, setView] = useState<View>("list");

  const activeCount = journals.filter((j) => j.isActive).length;

  const nextScheduled = journals
    .filter((j) => j.isActive)
    .sort((a, b) => new Date(a.nextRunDate).getTime() - new Date(b.nextRunDate).getTime())[0];

  const handleToggleActive = (id: string, active: boolean) => {
    setJournals((prev) =>
      prev.map((j) => (j.id === id ? { ...j, isActive: active } : j))
    );
    toast.success(active ? "Recurring journal activated" : "Recurring journal paused");
  };

  const handleDelete = (id: string) => {
    setJournals((prev) => prev.filter((j) => j.id !== id));
    toast.success("Recurring journal deleted");
  };

  const handleSave = (journal: RecurringJournal) => {
    setJournals((prev) => [...prev, journal]);
    setView("list");
  };

  if (view === "create") {
    return <RecurringJournalCreate onBack={() => setView("list")} onSave={handleSave} />;
  }

  return (
    <div className="p-6 space-y-6">
      <Heading
        title="Recurring Journals"
        description="Automate repetitive journal entries on a schedule"
      />
      <Separator />

      {/* Info Alert */}
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
        <Info className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
        <div className="text-sm text-emerald-800 dark:text-emerald-300">
          <p className="font-medium mb-1">About Recurring Journals</p>
          <p>
            Recurring journals automatically create draft journal entries at the scheduled
            frequency. Review and post them from the Journal Entries page.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{journals.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 dark:bg-emerald-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Next Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {nextScheduled ? formatDate(nextScheduled.nextRunDate) : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => setView("create")}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Table */}
      <RecurringJournalTable
        journals={journals}
        onToggleActive={handleToggleActive}
        onDelete={handleDelete}
      />
    </div>
  );
}
