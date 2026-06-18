/**
 * Recurring Invoices Page - Main container
 * Automate repetitive invoice generation.
 */

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Repeat, CheckCircle, CalendarClock, Info } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { RecurringInvoiceTable } from "./components/recurring-invoice-table";
import { RecurringInvoiceCreateForm } from "./components/recurring-invoice-create-form";
import { RecurringInvoiceDetail } from "./components/recurring-invoice-detail";
import type { RecurringInvoice } from "./types";

export function RecurringInvoicesPage() {
  const [templates, setTemplates] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedTemplate, setSelectedTemplate] = useState<RecurringInvoice | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get("/recurring-invoices", { pageSize: 100 }).catch(() => ({ data: [] }));
      setTemplates(result.data || []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  if (view === "create") {
    return <RecurringInvoiceCreateForm onBack={() => { setView("list"); loadTemplates(); }} />;
  }

  if (view === "detail" && selectedTemplate) {
    return (
      <RecurringInvoiceDetail
        template={selectedTemplate}
        onBack={() => { setView("list"); loadTemplates(); }}
      />
    );
  }

  const totalTemplates = templates.length;
  const active = templates.filter(t => t.isActive).length;
  const nextDue = templates
    .filter(t => t.isActive && t.nextInvoiceDate)
    .sort((a, b) => new Date(a.nextInvoiceDate).getTime() - new Date(b.nextInvoiceDate).getTime())[0];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Heading title="Recurring Invoices" description="Automate repetitive invoice generation" />
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setView("create")}>
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>
      <Separator />

      {/* Info Alert */}
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
        <Info className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
        <p className="text-sm text-emerald-800 dark:text-emerald-300">
          Recurring invoices automatically create draft invoices at the scheduled frequency.
          Review and send them from the Invoices page.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTemplates}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Due</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {nextDue ? formatDate(nextDue.nextInvoiceDate) : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <RecurringInvoiceTable
        templates={templates}
        loading={loading}
        onRefresh={loadTemplates}
        onView={(t) => { setSelectedTemplate(t); setView("detail"); }}
      />
    </div>
  );
}
