import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  filters: { status: string; search: string };
  onFilterChange: (f: { status: string; search: string }) => void;
  onCreateClick?: () => void;
}

export function ExpenseFilters({ filters, onFilterChange, onCreateClick }: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
      <div className="flex gap-3 flex-1 w-full sm:w-auto">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search expenses..." value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })} className="pl-9" />
        </div>
        <select value={filters.status} onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <Button size="sm" onClick={onCreateClick}><Plus className="size-4 mr-1" /> New Expense</Button>
    </div>
  );
}
