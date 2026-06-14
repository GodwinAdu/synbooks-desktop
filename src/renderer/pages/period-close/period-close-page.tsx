import { useState } from "react";
import { toast } from "sonner";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Info } from "lucide-react";
import { PeriodCard } from "./components/period-card";
import type { FiscalPeriod } from "./types";

function generateFiscalPeriods(): FiscalPeriod[] {
  const year = 2026;
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return months.map((month, index) => {
    const period = index + 1;
    const startDate = new Date(year, index, 1);
    const endDate = new Date(year, index + 1, 0); // last day of month

    return {
      id: `period-${year}-${period}`,
      year,
      period,
      name: `${month} ${year}`,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      status: "open" as const,
    };
  });
}

export function PeriodClosePage() {
  const [periods, setPeriods] = useState<FiscalPeriod[]>(generateFiscalPeriods);

  const earliestOpenPeriod = periods.find((p) => p.status === "open");

  const handleClose = (id: string) => {
    setPeriods((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: "closed" as const, closedAt: new Date().toISOString() }
          : p
      )
    );
    const period = periods.find((p) => p.id === id);
    toast.success(`${period?.name} has been closed`);
  };

  const handleLock = (id: string) => {
    setPeriods((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "locked" as const } : p))
    );
    const period = periods.find((p) => p.id === id);
    toast.success(`${period?.name} has been locked`);
  };

  return (
    <div className="p-6 space-y-6">
      <Heading
        title="Period Close"
        description="Close accounting periods to prevent changes to past transactions"
      />
      <Separator />

      {/* Info Alert */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
        <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800 dark:text-blue-300">
          <p className="font-medium mb-1">About Period Close</p>
          <p>
            Closing a period prevents new journal entries from being posted to that period.
            Locked periods cannot be reopened. Close periods sequentially (earliest first).
          </p>
        </div>
      </div>

      {/* Period Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {periods.map((period) => (
          <PeriodCard
            key={period.id}
            period={period}
            canClose={earliestOpenPeriod?.id === period.id}
            onClose={handleClose}
            onLock={handleLock}
          />
        ))}
      </div>
    </div>
  );
}
