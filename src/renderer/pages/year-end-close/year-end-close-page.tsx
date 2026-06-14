import { useState } from "react";
import { toast } from "sonner";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Circle } from "lucide-react";
import type { YearEndStep, YearEndStatus } from "./types";

const initialSteps: YearEndStep[] = [
  {
    id: "step-1",
    title: "Review all open periods",
    description: "Ensure all accounting periods for the fiscal year are closed",
    status: "pending",
  },
  {
    id: "step-2",
    title: "Verify trial balance",
    description: "Check that total debits equal total credits across all accounts",
    status: "pending",
  },
  {
    id: "step-3",
    title: "Post adjusting entries",
    description: "Record any year-end adjustments such as accruals and deferrals",
    status: "pending",
  },
  {
    id: "step-4",
    title: "Generate closing entries",
    description: "System creates entries to zero out all revenue and expense accounts",
    status: "pending",
  },
  {
    id: "step-5",
    title: "Transfer to retained earnings",
    description: "Net income or loss is transferred to the equity account (Retained Earnings)",
    status: "pending",
  },
  {
    id: "step-6",
    title: "Lock fiscal year",
    description: "Prevent any further changes to the fiscal year's transactions",
    status: "pending",
  },
];

export function YearEndClosePage() {
  const [yearEndStatus, setYearEndStatus] = useState<YearEndStatus>({
    fiscalYear: 2026,
    status: "open",
    steps: initialSteps,
  });

  const allCompleted = yearEndStatus.steps.every((s) => s.status === "completed");

  const handleMarkComplete = (stepId: string) => {
    setYearEndStatus((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.id === stepId
          ? { ...s, status: "completed" as const, completedAt: new Date().toISOString() }
          : s
      ),
    }));
    const step = yearEndStatus.steps.find((s) => s.id === stepId);
    toast.success(`"${step?.title}" marked as complete`);
  };

  const handleRunYearEndClose = () => {
    setYearEndStatus((prev) => ({
      ...prev,
      status: "completed",
    }));
    toast.success(`Year-end close completed for FY ${yearEndStatus.fiscalYear}`);
  };

  const statusBadge = () => {
    switch (yearEndStatus.status) {
      case "open":
        return <Badge variant="outline" className="border-emerald-500 text-emerald-600">Open</Badge>;
      case "in_progress":
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">In Progress</Badge>;
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Completed</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Heading
        title="Year-End Close"
        description="Close the fiscal year and prepare for the new period"
      />
      <Separator />

      {/* Warning Alert */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-800 dark:text-amber-300">
          <p className="font-medium mb-1">Important Notice</p>
          <p>
            Year-end close is a critical process. It creates closing entries that zero out
            revenue and expense accounts and transfers the net result to Retained Earnings.
            This cannot be undone.
          </p>
        </div>
      </div>

      {/* Fiscal Year Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Fiscal Year</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-2xl font-bold">FY {yearEndStatus.fiscalYear}</p>
              <p className="text-sm text-muted-foreground">
                January 1, {yearEndStatus.fiscalYear} — December 31, {yearEndStatus.fiscalYear}
              </p>
            </div>
            {statusBadge()}
          </div>
        </CardContent>
      </Card>

      {/* Steps Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Year-End Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {yearEndStatus.steps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-center gap-4 rounded-lg border p-4"
            >
              {/* Step indicator */}
              <div className="shrink-0">
                {step.status === "completed" ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                ) : (
                  <Circle className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium ${
                    step.status === "completed"
                      ? "text-muted-foreground line-through"
                      : ""
                  }`}
                >
                  {index + 1}. {step.title}
                </p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>

              {/* Action */}
              <div className="shrink-0">
                {step.status === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkComplete(step.id)}
                  >
                    Mark Complete
                  </Button>
                )}
                {step.status === "completed" && (
                  <span className="text-xs text-emerald-600 font-medium">Done</span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Run Year-End Close */}
      <div className="flex justify-end">
        <Button
          variant="destructive"
          size="lg"
          disabled={!allCompleted || yearEndStatus.status === "completed"}
          onClick={handleRunYearEndClose}
        >
          {yearEndStatus.status === "completed"
            ? "Year-End Close Completed"
            : "Run Year-End Close"}
        </Button>
      </div>
    </div>
  );
}
