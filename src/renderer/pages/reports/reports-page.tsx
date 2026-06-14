/**
 * Reports Landing Page
 * Shows all available report types as clickable cards (matches Next.js layout).
 */

import { Routes, Route, useNavigate } from "react-router-dom";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  TrendingUp, Scale, DollarSign, FileBarChart, FileText,
  Calendar, Receipt, BarChart3,
} from "lucide-react";
import { ProfitLossReport } from "./components/profit-loss-report";
import { BalanceSheetReport } from "./components/balance-sheet-report";
import { TrialBalanceReport } from "./components/trial-balance-report";
import { CashFlowReport } from "./components/cash-flow-report";
import { AgedReceivablesReport } from "./components/aged-receivables-report";
import { AgedPayablesReport } from "./components/aged-payables-report";
import { TaxSummaryReport } from "./components/tax-summary-report";

const reports = [
  { title: "Income Statement", description: "Revenue, expenses, and net income overview", icon: TrendingUp, path: "profit-loss", color: "text-emerald-600" },
  { title: "Financial Position", description: "Assets, liabilities, and equity at a point in time", icon: Scale, path: "balance-sheet", color: "text-blue-600" },
  { title: "Cash Flows", description: "Operating, investing, and financing activities", icon: DollarSign, path: "cash-flow", color: "text-green-600" },
  { title: "Trial Balance", description: "Debit and credit balances verification", icon: FileBarChart, path: "trial-balance", color: "text-purple-600" },
  { title: "Receivables Aging", description: "Outstanding customer invoices by age", icon: Calendar, path: "ar-aging", color: "text-cyan-600" },
  { title: "Payables Aging", description: "Outstanding vendor bills by age", icon: Calendar, path: "ap-aging", color: "text-pink-600" },
  { title: "Tax Summary", description: "Tax liability and payment summary", icon: Receipt, path: "tax", color: "text-red-600" },
];

function ReportsIndex() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <Heading title="Reports" description="Access financial reports and analytics for your business" />
      <Separator />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon;
          return (
            <Card
              key={report.path}
              className="hover:shadow-md transition-shadow cursor-pointer h-full"
              onClick={() => navigate(`/reports/${report.path}`)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${report.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{report.description}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function ReportsPage() {
  return (
    <Routes>
      <Route index element={<ReportsIndex />} />
      <Route path="profit-loss" element={<ProfitLossReport />} />
      <Route path="balance-sheet" element={<BalanceSheetReport />} />
      <Route path="trial-balance" element={<TrialBalanceReport />} />
      <Route path="cash-flow" element={<CashFlowReport />} />
      <Route path="ar-aging" element={<AgedReceivablesReport />} />
      <Route path="ap-aging" element={<AgedPayablesReport />} />
      <Route path="tax" element={<TaxSummaryReport />} />
    </Routes>
  );
}
