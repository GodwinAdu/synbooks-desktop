/**
 * Credit Note Detail View
 * Full view with line items, status actions, and apply-to-invoice flow.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  ArrowLeft, Send, CheckCircle, Ban, Trash2, Loader2,
} from "lucide-react";

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  issued: "bg-blue-100 text-blue-700",
  applied: "bg-emerald-100 text-emerald-700",
  voided: "bg-red-100 text-red-700",
};

interface Props {
  creditNoteId: string;
  onBack: () => void;
}

export function CreditNoteDetail({ creditNoteId, onBack }: Props) {
  const [creditNote, setCreditNote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");

  const fetchCreditNote = async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/credit-notes/${creditNoteId}`);
      setCreditNote(res.data || res);
    } catch {
      toast.error("Failed to load credit note");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCreditNote(); }, [creditNoteId]);

  const handleIssue = async () => {
    setActionLoading("issue");
    try {
      await api.post(`/credit-notes/${creditNoteId}/issue`);
      toast.success("Credit note issued");
      fetchCreditNote();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setActionLoading(null); }
  };

  const handleOpenApply = async () => {
    // Load unpaid invoices for this customer
    try {
      const params: any = { pageSize: 200 };
      if (creditNote.customerId) params.customerId = creditNote.customerId;
      const res: any = await api.get("/invoices", params);
      const unpaid = (res.data || []).filter((inv: any) => 
        inv.status !== "paid" && inv.status !== "cancelled" && (inv.totalAmount - (inv.paidAmount || 0)) > 0.01
      );
      setInvoices(unpaid);
      setSelectedInvoiceId(creditNote.invoiceId || (unpaid[0]?.id || ""));
      setShowApplyDialog(true);
    } catch {
      toast.error("Failed to load invoices");
    }
  };

  const handleApply = async () => {
    if (!selectedInvoiceId) { toast.error("Please select an invoice"); return; }
    setActionLoading("apply");
    try {
      await api.post(`/credit-notes/${creditNoteId}/apply`, { invoiceId: selectedInvoiceId });
      toast.success("Credit note applied to invoice");
      setShowApplyDialog(false);
      fetchCreditNote();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setActionLoading(null); }
  };

  const handleVoid = async () => {
    if (!confirm("Void this credit note? This cannot be undone.")) return;
    setActionLoading("void");
    try {
      await api.post(`/credit-notes/${creditNoteId}/void`);
      toast.success("Credit note voided");
      fetchCreditNote();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this credit note?")) return;
    setActionLoading("delete");
    try {
      await api.delete(`/credit-notes/${creditNoteId}`);
      toast.success("Credit note deleted");
      onBack();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setActionLoading(null); }
  };

  if (loading) {
    return <div className="p-6 space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!creditNote) {
    return <div className="p-6"><Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button><p className="text-muted-foreground mt-4">Not found.</p></div>;
  }

  const lineItems = Array.isArray(creditNote.lineItems) ? creditNote.lineItems : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{creditNote.creditNoteNumber}</h1>
              <Badge className={statusStyles[creditNote.status] || ""}>{creditNote.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{creditNote.customerName || "No customer"}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {creditNote.status === "draft" && (
            <Button size="sm" onClick={handleIssue} disabled={!!actionLoading}>
              {actionLoading === "issue" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Issue
            </Button>
          )}
          {creditNote.status === "issued" && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleOpenApply} disabled={!!actionLoading}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Apply to Invoice
            </Button>
          )}
          {(creditNote.status === "draft" || creditNote.status === "issued") && (
            <Button size="sm" variant="outline" className="text-amber-600 border-amber-200" onClick={handleVoid} disabled={!!actionLoading}>
              {actionLoading === "void" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Ban className="h-4 w-4 mr-1" />}
              Void
            </Button>
          )}
          {creditNote.status === "draft" && (
            <Button size="sm" variant="destructive" onClick={handleDelete} disabled={!!actionLoading}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
        </div>
      </div>
      <Separator />

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Credit Note Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Number</span><span className="font-mono font-medium">{creditNote.creditNoteNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{formatDate(creditNote.creditNoteDate)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{creditNote.customerName || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Linked Invoice</span><span className="font-mono">{creditNote.invoiceNumber || "None"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={statusStyles[creditNote.status] || ""}>{creditNote.status}</Badge></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Amount</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(creditNote.subtotal || creditNote.totalAmount || 0)}</span></div>
            {(creditNote.taxAmount || 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(creditNote.taxAmount)}</span></div>}
            <Separator />
            <div className="flex justify-between font-bold text-lg"><span>Total Credit</span><span className="text-red-600">{formatCurrency(creditNote.totalAmount || 0)}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* Reason */}
      {creditNote.reason && (
        <Card>
          <CardHeader><CardTitle className="text-base">Reason</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{creditNote.reason}</p></CardContent>
        </Card>
      )}

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
                    <TableCell className="text-right">{formatCurrency(li.rate || 0)}</TableCell>
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
        </CardContent>
      </Card>

      {/* Apply to Invoice Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Credit Note to Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Applying <span className="font-medium text-foreground">{creditNote.creditNoteNumber}</span> ({formatCurrency(creditNote.totalAmount)}) will reduce the selected invoice's balance.
            </p>
            <div className="space-y-2">
              <Label>Select Invoice *</Label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                <option value="">Select an invoice...</option>
                {invoices.map((inv: any) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} — Outstanding: {formatCurrency((inv.totalAmount || 0) - (inv.paidAmount || 0))}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>Cancel</Button>
            <Button onClick={handleApply} disabled={!!actionLoading || !selectedInvoiceId} className="bg-emerald-600 hover:bg-emerald-700">
              {actionLoading === "apply" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {actionLoading === "apply" ? "Applying..." : "Apply Credit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
