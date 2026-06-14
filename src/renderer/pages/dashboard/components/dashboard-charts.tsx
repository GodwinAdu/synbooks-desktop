/**
 * Dashboard Charts - Revenue vs Expenses + Recent Transactions
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { DashboardStats } from "../types";

interface Props {
  stats: DashboardStats;
}

export function DashboardCharts({ stats }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      {/* Revenue vs Expenses Chart */}
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Revenue vs Expenses</CardTitle>
          <CardDescription>Monthly comparison for the last 6 months</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          {stats.monthlyRevenueExpenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats.monthlyRevenueExpenses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Revenue" />
                <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest financial activities</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-4">
              {stats.recentTransactions.slice(0, 8).map((txn) => {
                const isIncome = txn.transactionType === "deposit" || txn.transactionType === "interest";
                return (
                  <div key={txn._id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`rounded-full p-2 shrink-0 ${isIncome ? "bg-emerald-100" : "bg-red-100"}`}>
                        {isIncome ? <ArrowUpIcon className="h-4 w-4 text-emerald-600" /> : <ArrowDownIcon className="h-4 w-4 text-red-600" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{txn.description}</p>
                        <p className="text-xs text-muted-foreground">{new Date(txn.transactionDate).toLocaleDateString("en-GB")}</p>
                      </div>
                    </div>
                    <div className={`text-sm font-semibold shrink-0 ${isIncome ? "text-emerald-600" : "text-red-600"}`}>
                      {isIncome ? "+" : "-"}{formatCurrency(txn.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
