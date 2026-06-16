/**
 * Invoice Table
 * Uses the shared DataTable component with TanStack React Table for sorting, search, and pagination.
 */

import { useState } from "react";
import { DataTable } from "@/components/table";
import { FileText } from "lucide-react";
import { getInvoiceColumns } from "./invoice-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import type { Invoice, PaginationState } from "../types";

interface Props {
  invoices: Invoice[];
  loading: boolean;
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}

export function InvoiceTable({ invoices, loading, onRefresh }: Props) {
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const columns = getInvoiceColumns({
    onView: (inv) => {
      // Open in a new detail dialog or navigate — for now show a toast with info
      toast.info(`Invoice ${inv.invoiceNumber}: ${formatCurrency(inv.totalAmount)} — Status: ${inv.status}`);
    },
    onEdit: (inv) => {
      toast.info("Edit is available from the Create Invoice form");
    },
    onDelete: async (inv) => {
      if (!confirm(`Delete invoice ${inv.invoiceNumber}?`)) return;
      try {
        await api.delete(`/invoices/${inv.id}`);
        toast.success("Invoice deleted");
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to delete");
      }
    },
    onSend: async (inv) => {
      try {
        await api.post(`/invoices/${inv.id}/send`);
        toast.success("Invoice marked as sent");
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to send");
      }
    },
    onRecordPayment: (inv) => {
      setPayingInvoice(inv);
    },
  });

  return (
    <>
      <DataTable
        columns={columns}
        data={invoices}
        searchKey="invoiceNumber"
        searchPlaceholder="Search invoices by number..."
        pageSize={20}
        emptyMessage="No invoices found. Create your first invoice to get started."
        emptyIcon={<FileText className="size-10 text-muted-foreground/50 mb-2" />}
      />
      {payingInvoice && (
        <RecordPaymentDialog
          invoice={payingInvoice}
          onClose={() => setPayingInvoice(null)}
          onSuccess={() => { setPayingInvoice(null); onRefresh(); }}
        />
      )}
    </>
  );
}

// ─── Record Payment Dialog ──────────────────────────────────────────────────
function RecordPaymentDialog({ invoice, onClose, onSuccess }: { invoice: Invoice; onClose: () => void; onSuccess: () => void }) {
  const [saving, setSaving] = useState(false);
  const outstanding = (invoice.totalAmount || 0) - (invoice.paidAmount || 0);
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
      await api.post(`/invoices/${invoice.id}/record-payment`, {
        amount,
        paymentMethod: form.paymentMethod,
        paymentDate: form.paymentDate,
        referenceNumber: form.reference,
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
        <DialogHeader><DialogTitle>Record Payment — {invoice.invoiceNumber}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Invoice Total</span><span>{formatCurrency(invoice.totalAmount)}</span></div>
            {(invoice.paidAmount || 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Already Paid</span><span className="text-emerald-600">{formatCurrency(invoice.paidAmount)}</span></div>}
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
