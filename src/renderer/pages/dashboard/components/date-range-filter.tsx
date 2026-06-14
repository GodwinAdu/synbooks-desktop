/**
 * Date Range Filter - Dropdown with presets for filtering dashboard data
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";

interface DateRange {
  from: Date;
  to: Date;
}

interface Props {
  onDateChange?: (range: DateRange) => void;
}

const presets = [
  { label: "Today", getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: "Last 7 days", getValue: () => ({ from: new Date(Date.now() - 7 * 86400000), to: new Date() }) },
  { label: "Last 30 days", getValue: () => ({ from: new Date(Date.now() - 30 * 86400000), to: new Date() }) },
  { label: "This Month", getValue: () => ({ from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), to: new Date() }) },
  { label: "Last Month", getValue: () => ({ from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), to: new Date(new Date().getFullYear(), new Date().getMonth(), 0) }) },
  { label: "This Quarter", getValue: () => { const q = Math.floor(new Date().getMonth() / 3); return { from: new Date(new Date().getFullYear(), q * 3, 1), to: new Date() }; } },
  { label: "This Year", getValue: () => ({ from: new Date(new Date().getFullYear(), 0, 1), to: new Date() }) },
  { label: "All Time", getValue: () => ({ from: new Date(2020, 0, 1), to: new Date() }) },
];

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function DateRangeFilter({ onDateChange }: Props) {
  const [range, setRange] = useState<DateRange>({ from: new Date(Date.now() - 30 * 86400000), to: new Date() });
  const [open, setOpen] = useState(false);

  const handleSelect = (preset: typeof presets[0]) => {
    const newRange = preset.getValue();
    setRange(newRange);
    onDateChange?.(newRange);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[260px] justify-start text-left font-normal">
          <CalendarIcon className="h-4 w-4 mr-2" />
          {formatDate(range.from)} - {formatDate(range.to)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="end">
        <p className="text-sm font-medium mb-2 px-2">Date Range</p>
        <div className="space-y-1">
          {presets.map((preset) => (
            <Button key={preset.label} variant="ghost" className="w-full justify-start font-normal h-8 text-sm" onClick={() => handleSelect(preset)}>
              {preset.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
