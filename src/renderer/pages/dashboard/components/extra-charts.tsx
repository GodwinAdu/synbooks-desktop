/**
 * Extra Charts - Weekly trend, Expense breakdown, Receivables vs Payables, Profit margin
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, Line, LineChart, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { DashboardStats } from "../types";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

interface Props {
  stats: DashboardStats;
}

export function ExtraCharts({ stats }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Cash Flow */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cash Flow Analysis</CardTitle>
          <CardDescription>Inflow vs Outflow trends</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.cashFlowData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No cash flow data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="inflow" fill="#10b981" radius={[8, 8, 0, 0]} name="Inflow" />
                <Bar dataKey="outflow" fill="#ef4444" radius={[8, 8, 0, 0]} name="Outflow" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Expense Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Expense Breakdown</CardTitle>
          <CardDescription>By category</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.expenseByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No expense data</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={stats.expenseByCategory} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2}>
                    {stats.expenseByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 overflow-hidden">
                {stats.expenseByCategory.slice(0, 6).map((d, i) => {
                  const total = stats.expenseByCategory.reduce((s, x) => s + x.value, 0);
                  return (
                    <div key={d.name} className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="truncate">{d.name}</span>
                      </div>
                      <span className="text-muted-foreground shrink-0">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receivables vs Payables */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Receivables vs Payables</CardTitle>
          <CardDescription>Outstanding balances</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-emerald-700 font-medium">Receivables</span>
              <span className="font-semibold">{formatCurrency(stats.receivablesVsPayables.receivables)}</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, (stats.receivablesVsPayables.receivables / Math.max(stats.receivablesVsPayables.receivables, stats.receivablesVsPayables.payables, 1)) * 100)}%` }} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-red-700 font-medium">Payables</span>
              <span className="font-semibold">{formatCurrency(stats.receivablesVsPayables.payables)}</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${Math.min(100, (stats.receivablesVsPayables.payables / Math.max(stats.receivablesVsPayables.receivables, stats.receivablesVsPayables.payables, 1)) * 100)}%` }} />
            </div>
          </div>
          <div className="pt-2 border-t flex justify-between text-sm">
            <span className="text-muted-foreground">Net Position</span>
            <span className={`font-bold ${stats.receivablesVsPayables.receivables >= stats.receivablesVsPayables.payables ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(stats.receivablesVsPayables.receivables - stats.receivablesVsPayables.payables)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Profit Margin Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Profit Margin</CardTitle>
          <CardDescription>Monthly margin % trend</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.profitMarginTrend.every((d) => d.margin === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={stats.profitMarginTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Line type="monotone" dataKey="margin" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="Margin" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
