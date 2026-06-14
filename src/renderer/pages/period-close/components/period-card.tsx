import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, XCircle } from "lucide-react";
import type { FiscalPeriod } from "../types";

interface PeriodCardProps {
  period: FiscalPeriod;
  canClose: boolean;
  onClose: (id: string) => void;
  onLock: (id: string) => void;
}

export function PeriodCard({ period, canClose, onClose, onLock }: PeriodCardProps) {
  const statusBadge = () => {
    switch (period.status) {
      case "open":
        return <Badge variant="outline" className="border-emerald-500 text-emerald-600">Open</Badge>;
      case "closed":
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Closed</Badge>;
      case "locked":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Locked</Badge>;
    }
  };

  const formatDateRange = () => {
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    const startStr = start.toLocaleDateString("en-GH", { month: "short", day: "numeric" });
    const endStr = end.toLocaleDateString("en-GH", { month: "short", day: "numeric", year: "numeric" });
    return `${startStr} - ${endStr}`;
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{period.name}</CardTitle>
          {statusBadge()}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-3">
        <p className="text-sm text-muted-foreground">{formatDateRange()}</p>

        <div className="mt-auto space-y-2">
          {period.status === "open" && canClose && (
            <Button
              size="sm"
              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => onClose(period.id)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Close Period
            </Button>
          )}
          {period.status === "closed" && (
            <Button
              size="sm"
              variant="destructive"
              className="w-full"
              onClick={() => onLock(period.id)}
            >
              <Lock className="h-4 w-4 mr-2" />
              Lock Period
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
