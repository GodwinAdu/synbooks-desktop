/**
 * Invoice Detail View
 * Shows full invoice info, line items, payment history, and actions.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  ArrowLeft, Edit, Send, DollarSign, FileDown, XCircle, Loader2,
} from "lucide-react";
import type { Invoice } from "../types";

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

interface Props {
  invoiceId: string;
  onBack: () => void;
  onEdit: (invoice: any) => void;
}

export function InvoiceDetail({ invoiceId, onBack, onEdit }: Props) {
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/invoices/${invoiceId}`);
      setInvoice(res.data || res);
    } catch {
      toast.error("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoice(); }, [invoiceId]);

  const handleSend = async () => {
    setActionLoading("send");
    try {
      await api.post(`/invoices/${invoiceId}/send`);
      toast.success("Invoice marked as sent");
      fetchInvoice();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setActionLoading(null); }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this invoice? This cannot be undone.")) return;
    setActionLoading("cancel");
    try {
      await api.put(`/invoices/${invoiceId}`, { status: "cancelled" });
      toast.success("Invoice cancelled");
      fetchInvoice();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setActionLoading(null); }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
        <p className="text-muted-foreground">Invoice not found.</p>
      </div>
    );
  }

  const balance = (invoice.totalAmount || 0) - (invoice.paidAmount || 0);
  const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];

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
              <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
              <Badge className={statusStyles[invoice.status] || ""}>{invoice.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {invoice.customer?.name || "Walk-in Customer"}
            </p>
          </div>
        </div>
        {/* Actions */}
        <div className="flex gap-2">
          {invoice.status === "draft" && (
            <>
              <Button size="sm" variant="outline" onClick={() => onEdit(invoice)}>
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSend} disabled={!!actionLoading}>
                {actionLoading === "send" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                Mark as Sent
              </Button>
            </>
          )}
          {invoice.status !== "cancelled" && invoice.status !== "paid" && (
            <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={handleCancel} disabled={!!actionLoading}>
              <XCircle className="h-4 w-4 mr-1" /> Cancel
            </Button>
          )}
        </div>
      </div>
      <Separator />

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Invoice Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Invoice Number</span><span className="font-medium">{invoice.invoiceNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Invoice Date</span><span>{formatDate(invoice.invoiceDate)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Due Date</span><span>{formatDate(invoice.dueDate)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{invoice.customer?.name || "Walk-in"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={statusStyles[invoice.status] || ""}>{invoice.status}</Badge></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Payment Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(invoice.subtotal || invoice.totalAmount)}</span></div>
            {(invoice.taxAmount || 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(invoice.taxAmount)}</span></div>}
            <div className="flex justify-between font-semibold"><span>Total</span><span className="text-lg">{formatCurrency(invoice.totalAmount)}</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="text-emerald-600 font-medium">{formatCurrency(invoice.paidAmount || 0)}</span></div>
            <div className="flex justify-between font-semibold">
              <span>Balance Due</span>
              <span className={balance > 0.01 ? "text-red-600" : "text-emerald-600"}>{formatCurrency(balance)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

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
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((li: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{li.description || li.name || "—"}</TableCell>
                    <TableCell className="text-right">{li.quantity || 1}</TableCell>
                    <TableCell className="text-right">{formatCurrency(li.rate || li.unitPrice || 0)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{li.taxRate ? `${li.taxRate}%` : "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(li.amount || li.total || (li.quantity || 1) * (li.rate || 0))}</TableCell>
                  </TableRow>
                ))}
                {lineItems.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No line items</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Notes & Terms */}
      {(invoice.notes || invoice.terms) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {invoice.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p></CardContent>
            </Card>
          )}
          {invoice.terms && (
            <Card>
              <CardHeader><CardTitle className="text-base">Terms & Conditions</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.terms}</p></CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
