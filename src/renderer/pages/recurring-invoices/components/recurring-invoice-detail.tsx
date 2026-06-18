/**
 * Recurring Invoice Detail View
 * Shows template info, schedule, line items, and actions.
 */

import { useState } from "react";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  ArrowLeft, Play, Pause, Zap, Trash2, Loader2, CalendarClock, Repeat, DollarSign,
} from "lucide-react";
import type { RecurringInvoice } from "../types";

const frequencyLabels: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

interface Props {
  template: RecurringInvoice;
  onBack: () => void;
}

export function RecurringInvoiceDetail({ template, onBack }: Props) {
  const [current, setCurrent] = useState(template);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const lineItems = Array.isArray(current.lineItems) ? current.lineItems : [];

  const handleToggle = async () => {
    setActionLoading("toggle");
    try {
      await api.put(`/recurring-invoices/${current.id}`, { isActive: current.isActive ? 0 : 1 });
      setCurrent({ ...current, isActive: current.isActive ? 0 : 1 });
      toast.success(current.isActive ? "Template paused" : "Template resumed");
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setActionLoading(null); }
  };

  const handleGenerateNow = async () => {
    setActionLoading("generate");
    try {
      await api.post(`/recurring-invoices/${current.id}/generate`);
      toast.success("Draft invoice generated! Check the Invoices page.");
    } catch (e: any) { toast.error(e.message || "Failed to generate"); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this recurring template? This cannot be undone.")) return;
    setActionLoading("delete");
    try {
      await api.delete(`/recurring-invoices/${current.id}`);
      toast.success("Template deleted");
      onBack();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setActionLoading(null); }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{current.templateName}</h1>
              <Badge variant="outline" className={current.isActive ? "border-emerald-500 text-emerald-600" : "border-gray-300 text-gray-500"}>
                {current.isActive ? "Active" : "Paused"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{current.customerName || "No customer"}</p>
          </div>
        </div>
        {/* Actions */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleToggle} disabled={!!actionLoading}>
            {actionLoading === "toggle" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : current.isActive ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            {current.isActive ? "Pause" : "Resume"}
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleGenerateNow} disabled={!!actionLoading}>
            {actionLoading === "generate" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
            Generate Now
          </Button>
          <Button size="sm" variant="destructive" onClick={handleDelete} disabled={!!actionLoading}>
            {actionLoading === "delete" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
            Delete
          </Button>
        </div>
      </div>
      <Separator />

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                <Repeat className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Frequency</p>
                <p className="text-lg font-bold">{frequencyLabels[current.frequency] || current.frequency}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                <CalendarClock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Next Invoice</p>
                <p className="text-lg font-bold">{formatDate(current.nextInvoiceDate || current.nextRunDate) || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Amount per Invoice</p>
                <p className="text-lg font-bold">{formatCurrency(current.totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Details */}
      <Card>
        <CardHeader><CardTitle className="text-base">Schedule Details</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-muted-foreground">Start Date</p>
              <p className="font-medium">{formatDate(current.startDate) || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">End Date</p>
              <p className="font-medium">{current.endDate ? formatDate(current.endDate) : "No end date"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Generated</p>
              <p className="font-medium">{current.lastGeneratedAt ? formatDate(current.lastGeneratedAt) : "Never"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Invoices Generated</p>
              <p className="font-medium">{current.invoicesGenerated || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Tax %</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((li: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{li.description || "—"}</TableCell>
                    <TableCell className="text-right">{li.quantity || 1}</TableCell>
                    <TableCell className="text-right">{formatCurrency(li.rate || li.unitPrice || 0)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{li.taxRate ? `${li.taxRate}%` : "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(li.amount || (li.quantity || 1) * (li.rate || 0))}</TableCell>
                  </TableRow>
                ))}
                {lineItems.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No line items</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {/* Totals */}
          <div className="flex justify-end mt-4">
            <div className="w-64 space-y-1 text-sm">
              {(current.subtotal || 0) !== (current.totalAmount || 0) && (
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(current.subtotal || 0)}</span></div>
              )}
              {(current.taxAmount || 0) > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(current.taxAmount || 0)}</span></div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Total</span><span>{formatCurrency(current.totalAmount)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
