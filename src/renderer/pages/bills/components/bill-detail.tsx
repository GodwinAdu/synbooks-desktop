/**
 * Bill Detail View
 * Shows full bill info, line items, and actions.
 * Pattern matches InvoiceDetail with Record Payment dialog.
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, CheckCircle, DollarSign, CreditCard, XCircle, Loader2,
} from "lucide-react";

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  open: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

interface Props {
  billId: string;
  onBack: () => void;
}

export function BillDetail({ billId, onBack }: Props) {
  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const fetchBill = async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/bills/${billId}`);
      setBill(res.data || res);
    } catch {
      toast.error("Failed to load bill");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBill(); }, [billId]);

  const handleApprove = async () => {
    setActionLoading("approve");
    try {
      await api.post(`/bills/${billId}/approve`);
      toast.success("Bill approved");
      fetchBill();
    } catch (e: any) { toast.error(e.message || "Failed to approve"); }
    finally { setActionLoading(null); }
  };

  const handleMarkPaid = async () => {
    if (!confirm("Mark this bill as fully paid? This will post a payment to GL.")) return;
    setActionLoading("paid");
    try {
      await api.post(`/bills/${billId}/mark-paid`);
      toast.success("Bill marked as paid");
      fetchBill();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setActionLoading(null); }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this bill? This cannot be undone.")) return;
    setActionLoading("cancel");
    try {
      await api.put(`/bills/${billId}`, { status: "cancelled" });
      toast.success("Bill cancelled");
      fetchBill();
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

  if (!bill) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
        <p className="text-muted-foreground">Bill not found.</p>
      </div>
    );
  }

  const balance = (bill.totalAmount || 0) - (bill.paidAmount || 0);
  const lineItems = Array.isArray(bill.lineItems) ? bill.lineItems : [];

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
              <h1 className="text-2xl font-bold">{bill.billNumber}</h1>
              <Badge className={statusStyles[bill.status] || ""}>{bill.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {bill.vendor?.name || "Unknown Vendor"}
            </p>
          </div>
        </div>
        {/* Actions */}
        <div className="flex gap-2">
          {bill.status === "draft" && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleApprove} disabled={!!actionLoading}>
              {actionLoading === "approve" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
              Approve
            </Button>
          )}
          {(bill.status === "open" || bill.status === "overdue") && balance > 0.01 && (
            <Button size="sm" variant="outline" onClick={() => setShowPaymentDialog(true)} disabled={!!actionLoading}>
              <DollarSign className="h-4 w-4 mr-1" />
              Record Payment
            </Button>
          )}
          {(bill.status === "open" || bill.status === "overdue") && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleMarkPaid} disabled={!!actionLoading}>
              {actionLoading === "paid" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CreditCard className="h-4 w-4 mr-1" />}
              Mark as Paid
            </Button>
          )}
          {bill.status !== "cancelled" && bill.status !== "paid" && (
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
          <CardHeader><CardTitle className="text-base">Bill Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Bill Number</span><span className="font-medium">{bill.billNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Bill Date</span><span>{formatDate(bill.billDate)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Due Date</span><span>{formatDate(bill.dueDate)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Vendor</span><span>{bill.vendor?.name || "—"}</span></div>
            {bill.referenceNumber && <div className="flex justify-between"><span className="text-muted-foreground">Reference #</span><span>{bill.referenceNumber}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={statusStyles[bill.status] || ""}>{bill.status}</Badge></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Payment Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(bill.subtotal || bill.totalAmount)}</span></div>
            {(bill.taxAmount || 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(bill.taxAmount)}</span></div>}
            <div className="flex justify-between font-semibold"><span>Total</span><span className="text-lg">{formatCurrency(bill.totalAmount)}</span></div>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span className="text-emerald-600 font-medium">{formatCurrency(bill.paidAmount || 0)}</span></div>
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

      {/* Notes */}
      {bill.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{bill.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Record Payment Dialog */}
      {showPaymentDialog && (
        <RecordBillPaymentDialog
          bill={bill}
          onClose={() => setShowPaymentDialog(false)}
          onSuccess={() => { setShowPaymentDialog(false); fetchBill(); }}
        />
      )}
    </div>
  );
}

// ─── Record Payment Dialog (for detail view) ────────────────────────────────
function RecordBillPaymentDialog({ bill, onClose, onSuccess }: { bill: any; onClose: () => void; onSuccess: () => void }) {
  const [saving, setSaving] = useState(false);
  const outstanding = (bill.totalAmount || 0) - (bill.paidAmount || 0);
  const [form, setForm] = useState({
    amount: outstanding.toFixed(2),
    paymentMethod: "bank_transfer",
    paymentDate: new Date().toISOString().slice(0, 10),
    reference: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { toast.error("Enter a valid amount"); return; }
    if (amount > outstanding + 0.01) { toast.error(`Amount exceeds outstanding (${formatCurrency(outstanding)})`); return; }
    setSaving(true);
    try {
      await api.post(`/bills/${bill.id}/record-payment`, {
        amount,
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
        reference: form.reference,
      });
      toast.success(`Payment of ${formatCurrency(amount)} recorded`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Record Payment — {bill.billNumber}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Bill Total</span><span>{formatCurrency(bill.totalAmount)}</span></div>
            {(bill.paidAmount || 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Already Paid</span><span className="text-emerald-600">{formatCurrency(bill.paidAmount)}</span></div>}
            <div className="flex justify-between font-semibold border-t pt-1"><span>Outstanding</span><span className="text-orange-600">{formatCurrency(outstanding)}</span></div>
          </div>
          <div className="space-y-2"><Label>Amount (GHS) *</Label><Input type="number" step="0.01" max={outstanding} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} /></div>
          <div className="space-y-2"><Label>Reference / Transaction ID</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="e.g. TXN-12345" /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? "Recording..." : "Record Payment"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
