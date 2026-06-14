/**
 * Onboarding Checklist - 10-step getting started guide with progress
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X, Rocket } from "lucide-react";

export interface OnboardingStatus {
  hasCompanyDetails: boolean;
  hasLogo: boolean;
  hasTaxId: boolean;
  hasBankAccount: boolean;
  hasChartOfAccounts: boolean;
  hasTeamMember: boolean;
  hasEmployee: boolean;
  hasCustomer: boolean;
  hasInvoice: boolean;
  hasExpense: boolean;
}

interface Props {
  status: OnboardingStatus;
}

export function OnboardingChecklist({ status }: Props) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(true);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("onboarding-dismissed") === "true");

  const steps = [
    { label: "Add company details", description: "Fill in your company name, phone, and address", done: status.hasCompanyDetails, path: "/settings" },
    { label: "Upload your company logo", description: "Add a logo to appear on invoices", done: status.hasLogo, path: "/settings" },
    { label: "Add your Tax ID", description: "Required for tax compliance and invoicing", done: status.hasTaxId, path: "/settings" },
    { label: "Connect a bank account", description: "Link your bank to track transactions", done: status.hasBankAccount, path: "/banking" },
    { label: "Set up chart of accounts", description: "Configure your accounting structure", done: status.hasChartOfAccounts, path: "/accounts" },
    { label: "Add a customer", description: "Create your first customer record", done: status.hasCustomer, path: "/customers" },
    { label: "Create your first invoice", description: "Send a professional invoice", done: status.hasInvoice, path: "/invoices" },
    { label: "Record an expense", description: "Track your first business expense", done: status.hasExpense, path: "/expenses" },
    { label: "Add an employee", description: "Set up payroll by adding your first employee", done: status.hasEmployee, path: "/employees" },
    { label: "Invite a team member", description: "Give your team access to SyncBooks", done: status.hasTeamMember, path: "/settings" },
  ];

  const completed = steps.filter(s => s.done).length;
  const percent = Math.round((completed / steps.length) * 100);

  if (dismissed || completed === steps.length) return null;

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10 dark:border-emerald-900">
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white"><Rocket className="h-4 w-4" /></div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm">Get started with SyncBooks</p>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">{completed}/{steps.length} done</Badge>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={percent} className="h-1.5 w-32" />
                <span className="text-xs text-muted-foreground">{percent}% complete</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { localStorage.setItem("onboarding-dismissed", "true"); setDismissed(true); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="px-5 pb-5">
          <div className="grid sm:grid-cols-2 gap-2">
            {steps.map((step, i) => (
              <button key={i} onClick={() => !step.done && navigate(step.path)}
                className={`group flex items-start gap-3 rounded-lg border px-4 py-3 text-sm text-left transition-all ${
                  step.done ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30 cursor-default" : "border-border bg-background hover:border-emerald-400 hover:shadow-sm"
                }`}>
                <div className="mt-0.5 shrink-0">
                  {step.done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />}
                </div>
                <div className="min-w-0">
                  <p className={`font-medium leading-tight ${step.done ? "line-through text-emerald-600/60" : ""}`}>{step.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{step.description}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
