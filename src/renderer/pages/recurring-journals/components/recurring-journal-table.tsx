import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import { Repeat, Trash2 } from "lucide-react";
import type { RecurringJournal } from "../types";

interface RecurringJournalTableProps {
  journals: RecurringJournal[];
  onToggleActive: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}

const frequencyColors: Record<string, string> = {
  daily: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  weekly: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  monthly: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  quarterly: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  yearly: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function RecurringJournalTable({
  journals,
  onToggleActive,
  onDelete,
}: RecurringJournalTableProps) {
  if (journals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Repeat className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">
          No recurring journals configured
        </h3>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Create a template to automate repetitive journal entries.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Next Run</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="w-[60px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {journals.map((journal) => (
            <TableRow key={journal.id}>
              <TableCell className="font-medium">{journal.name}</TableCell>
              <TableCell className="text-muted-foreground max-w-[200px] truncate">
                {journal.description}
              </TableCell>
              <TableCell>
                <Badge className={frequencyColors[journal.frequency] || ""}>
                  {journal.frequency}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(journal.nextRunDate)}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(journal.totalAmount)}
              </TableCell>
              <TableCell>
                <Switch
                  checked={journal.isActive}
                  onCheckedChange={(checked) => onToggleActive(journal.id, checked)}
                />
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500 hover:text-red-700"
                  onClick={() => onDelete(journal.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
