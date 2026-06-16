/**
 * Year-End Close Page
 * Smart checklist that auto-checks against real data.
 * Matches the Next.js app: progress bar, grouped categories, action links.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useNavigate } from "react-router-dom";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2, AlertTriangle, Circle, ExternalLink, CalendarCheck, Lock, Info,
} from "lucide-react";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: string;
  status: "complete" | "warning" | "incomplete";
  detail?: string;
  actionUrl?: string;
}

interface YearEndData {
  fiscalYear: number;
  items: ChecklistItem[];
  summary: { complete: number; total: number; percentage: number };
}

const CATEGORY_LABELS: Record<string, string> = {
  reconciliation: "Bank Reconciliation",
  receivables: "Accounts Receivable",
  payables: "Accounts Payable",
  accounting: "Accounting & Closing",
  reports: "Reports & Backup",
};

const STATUS_ICON = {
  complete: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  incomplete: <Circle className="h-5 w-5 text-muted-foreground" />,
};

export function YearEndClosePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<YearEndData | null>(null);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const fetchData = async (year: number) => {
    setLoading(true);
    try {
      const res: any = await api.get("/year-end-close", { year });
      setData(res);
    } catch {
      // Fallback if endpoint not ready
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(selectedYear); }, [selectedYear]);

  const handleYearChange = (y: string) => {
    setSelectedYear(parseInt(y));
  };

  // Group items by category
  const grouped = data
    ? Object.entries(CATEGORY_LABELS)
        .map(([key, label]) => ({
          key,
          label,
          items: data.items.filter((i) => i.category === key),
        }))
        .filter((g) => g.items.length > 0)
    : [];

  return (
    <div className="p-6 space-y-6">
      <Heading title="Year-End Close" description="Close the fiscal year and prepare for the new period" />
      <Separator />

      {/* Info Alert */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
        <Info className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
          <p className="font-semibold">Year-End Close Guide</p>
          <p>Year-end close ensures all transactions are properly recorded, accounts are reconciled, and your books are ready for the new fiscal year. Complete all checklist items before finalizing.</p>
          <p className="text-red-700 dark:text-red-400 font-medium mt-2">⚠️ Closing the year creates permanent closing entries. Ensure everything is correct before proceeding.</p>
        </div>
      </div>

      {/* Header with year selector and progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarCheck className="h-6 w-6 text-emerald-600" />
          <div>
            <h2 className="text-xl font-bold">FY {selectedYear}</h2>
            {data && (
              <p className="text-sm text-muted-foreground">
                {data.summary.complete}/{data.summary.total} tasks complete
              </p>
            )}
          </div>
        </div>
        <Select value={String(selectedYear)} onValueChange={handleYearChange}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Progress bar */}
      {data && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className={`text-sm font-bold ${data.summary.percentage === 100 ? "text-emerald-600" : "text-amber-600"}`}>
                {data.summary.percentage}%
              </span>
            </div>
            <Progress value={data.summary.percentage} className="h-3" />
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                {data.items.filter((i) => i.status === "complete").length} Complete
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                {data.items.filter((i) => i.status === "warning").length} Needs Attention
              </span>
              <span className="flex items-center gap-1">
                <Circle className="h-3 w-3 text-muted-foreground" />
                {data.items.filter((i) => i.status === "incomplete").length} To Do
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="text-center py-8 text-sm text-muted-foreground">Loading checklist...</div>
      )}

      {/* Checklist by category */}
      {grouped.map((group) => (
        <Card key={group.key}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{group.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {group.items.map((item) => (
              <div key={item.id} className="flex items-start gap-3 py-3 border-b last:border-0">
                <div className="mt-0.5 shrink-0">{STATUS_ICON[item.status]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-medium ${item.status === "complete" ? "line-through text-muted-foreground" : ""}`}>
                      {item.title}
                    </span>
                    {item.detail && (
                      <Badge
                        variant="outline"
                        className={`text-xs ${item.status === "warning" ? "border-amber-400 text-amber-600" : ""}`}
                      >
                        {item.detail}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                </div>
                {item.actionUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-xs gap-1"
                    onClick={() => navigate(item.actionUrl!)}
                  >
                    <ExternalLink className="h-3 w-3" /> Go
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Completion banner */}
      {data && data.summary.percentage === 100 && (
        <Card className="border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-3" />
            <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-300">Year-End Complete! 🎉</h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1">
              All checklist items for FY {selectedYear} are done. Your books are ready for the new fiscal year.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
