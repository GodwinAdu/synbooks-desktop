/**
 * Invoice Summary Cards
 * Displays key metrics at the top of the invoices page.
 */

import { FileText, DollarSign, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import type { InvoiceSummary } from "../types";

interface Props {
  summary: InvoiceSummary;
}

export function InvoiceSummaryCards({ summary }: Props) {
  const cards = [
    {
      label: "Total Invoices",
      value: summary.totalInvoices.toString(),
      icon: FileText,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950/50",
    },
    {
      label: "Total Invoiced",
      value: formatCurrency(summary.totalAmount),
      icon: DollarSign,
      color: "text-green-600 bg-green-50 dark:bg-green-950/50",
    },
    {
      label: "Paid",
      value: formatCurrency(summary.paidAmount),
      icon: CheckCircle,
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50",
    },
    {
      label: "Outstanding",
      value: formatCurrency(summary.outstanding),
      icon: Clock,
      color: "text-amber-600 bg-amber-50 dark:bg-amber-950/50",
    },
    {
      label: "Overdue",
      value: summary.overdue.toString(),
      icon: AlertTriangle,
      color: "text-red-600 bg-red-50 dark:bg-red-950/50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="py-4">
          <CardContent className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${card.color}`}>
              <card.icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate">{card.label}</p>
              <p className="text-lg font-bold truncate">{card.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
