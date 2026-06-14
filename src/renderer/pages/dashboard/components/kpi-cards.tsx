/**
 * KPI Cards - Main financial metrics at the top of the dashboard
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, CreditCard, TrendingUp, Users, ArrowUpIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { DashboardStats } from "../types";

interface Props {
  stats: DashboardStats;
}

export function KPICards({ stats }: Props) {
  const cards = [
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      change: stats.revenueChange,
      icon: DollarSign,
      iconColor: "text-emerald-600",
    },
    {
      title: "Total Expenses",
      value: formatCurrency(stats.totalExpenses),
      change: stats.expensesChange,
      invertChange: true,
      icon: CreditCard,
      iconColor: "text-red-600",
    },
    {
      title: "Net Income",
      value: formatCurrency(stats.netProfit),
      change: stats.profitChange,
      icon: TrendingUp,
      iconColor: "text-emerald-600",
    },
    {
      title: "Active Employees",
      value: stats.activeEmployees.toString(),
      subtitle: stats.newEmployeesThisMonth > 0 ? `${stats.newEmployeesThisMonth} new this month` : "No new hires this month",
      icon: Users,
      iconColor: "text-blue-600",
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const changePositive = card.invertChange
          ? (card.change ?? 0) <= 0
          : (card.change ?? 0) >= 0;

        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.iconColor} hidden sm:block`} />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold truncate">{card.value}</div>
              {card.change !== null && card.change !== undefined ? (
                <div className={`flex items-center text-[10px] sm:text-xs ${changePositive ? "text-emerald-600" : "text-red-600"}`}>
                  <ArrowUpIcon className={`mr-1 h-3 w-3 ${!changePositive ? "rotate-180" : ""}`} />
                  <span>{Math.abs(card.change)}% from last month</span>
                </div>
              ) : (
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {card.subtitle || "No prior month data"}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
