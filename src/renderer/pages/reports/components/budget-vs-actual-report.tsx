/**
 * Budget vs Actual Report
 * Compares budgeted amounts against actual performance.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportHeader } from "./report-header";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, Target } from "lucide-react";

export function BudgetVsActualReport() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/reports/budget-vs-actual")
      .then((res: any) => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <ReportHeader title="Budget vs Actual" subtitle="Compare budgeted amounts against actual performance" showDateRange={false} onPrint={() => window.print()} />

      {loading ? <Skeleton className="h-96 w-full" /> : data ? (
        <>
          {data.budgets.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Target className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-3" />
                  <p className="text-sm text-muted-foreground">No budgets found</p>
                  <p className="text-xs text-muted-foreground mt-1">Create a budget in the Budgets module to see comparisons here.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            data.budgets.map((budget: any) => (
              <Card key={budget.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{budget.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(budget.startDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })} – {new Date(budget.endDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <Badge className={budget.utilizationPercent > 100 ? "bg-red-100 text-red-700" : budget.utilizationPercent > 80 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}>
                      {budget.utilizationPercent.toFixed(0)}% utilized
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Summary Row */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Budget</p>
                      <p className="text-lg font-bold">{formatCurrency(budget.totalBudget)}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Actual</p>
                      <p className={`text-lg font-bold ${budget.totalActual > budget.totalBudget ? "text-red-600" : "text-emerald-600"}`}>{formatCurrency(budget.totalActual)}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Variance</p>
                      <p className={`text-lg font-bold ${budget.totalVariance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {budget.totalVariance >= 0 ? "" : "-"}{formatCurrency(Math.abs(budget.totalVariance))}
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Budget Usage</span>
                      <span>{budget.utilizationPercent.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${budget.utilizationPercent > 100 ? "bg-red-500" : budget.utilizationPercent > 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, budget.utilizationPercent)}%` }} />
                    </div>
                  </div>

                  {/* Line Items */}
                  {budget.lineItems.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left py-2 px-3 font-semibold">Category</th>
                            <th className="text-right py-2 px-3 font-semibold">Budget</th>
                            <th className="text-right py-2 px-3 font-semibold">Actual</th>
                            <th className="text-right py-2 px-3 font-semibold">Variance</th>
                            <th className="text-right py-2 px-3 font-semibold">%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {budget.lineItems.map((item: any, idx: number) => (
                            <tr key={idx} className="border-b">
                              <td className="py-2 px-3">{item.categoryName || item.accountName || "—"}</td>
                              <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(item.amount || 0)}</td>
                              <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(item.actual || 0)}</td>
                              <td className={`py-2 px-3 text-right tabular-nums ${item.variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                {item.variance >= 0 ? "" : "-"}{formatCurrency(Math.abs(item.variance || 0))}
                              </td>
                              <td className="py-2 px-3 text-right">
                                {item.amount > 0 && (
                                  <Badge variant="outline" className={`text-[10px] ${item.actual > item.amount ? "border-red-300 text-red-600" : "border-emerald-300 text-emerald-600"}`}>
                                    {((item.actual / item.amount) * 100).toFixed(0)}%
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </>
      ) : null}
    </div>
  );
}
