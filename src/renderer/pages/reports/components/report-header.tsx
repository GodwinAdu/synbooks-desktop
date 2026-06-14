/**
 * Shared report header with date picker, print, and export buttons.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Printer, Download, FileSpreadsheet } from "lucide-react";

interface ReportHeaderProps {
  title: string;
  subtitle?: string;
  startDate?: string;
  endDate?: string;
  onDateChange?: (start: string, end: string) => void;
  onPrint?: () => void;
  onExportCSV?: () => void;
  showDateRange?: boolean;
  /** For balance sheet - single date */
  asOfDate?: string;
  onAsOfDateChange?: (date: string) => void;
}

export function ReportHeader({
  title,
  subtitle,
  startDate,
  endDate,
  onDateChange,
  onPrint,
  onExportCSV,
  showDateRange = true,
  asOfDate,
  onAsOfDateChange,
}: ReportHeaderProps) {
  const navigate = useNavigate();
  const [localStart, setLocalStart] = useState(startDate || "");
  const [localEnd, setLocalEnd] = useState(endDate || "");
  const [localAsOf, setLocalAsOf] = useState(asOfDate || "");

  const handleApply = () => {
    if (onDateChange && localStart && localEnd) {
      onDateChange(localStart, localEnd);
    }
    if (onAsOfDateChange && localAsOf) {
      onAsOfDateChange(localAsOf);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/reports")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-xs sm:text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showDateRange && onDateChange && (
            <>
              <Input
                type="date"
                className="w-36 h-9 text-sm"
                value={localStart}
                onChange={(e) => setLocalStart(e.target.value)}
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="date"
                className="w-36 h-9 text-sm"
                value={localEnd}
                onChange={(e) => setLocalEnd(e.target.value)}
              />
              <Button size="sm" onClick={handleApply}>Apply</Button>
            </>
          )}
          {asOfDate !== undefined && onAsOfDateChange && (
            <>
              <span className="text-sm text-muted-foreground">As of:</span>
              <Input
                type="date"
                className="w-36 h-9 text-sm"
                value={localAsOf}
                onChange={(e) => setLocalAsOf(e.target.value)}
              />
              <Button size="sm" onClick={handleApply}>Apply</Button>
            </>
          )}
          {onPrint && (
            <Button variant="outline" size="sm" onClick={onPrint}>
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
          )}
          {onExportCSV && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={onExportCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          )}
        </div>
      </div>
      <Separator />
    </div>
  );
}
