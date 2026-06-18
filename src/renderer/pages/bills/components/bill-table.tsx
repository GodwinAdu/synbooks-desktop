/**
 * Bill Table
 * Uses the shared DataTable component with TanStack React Table.
 * Includes Record Payment dialog (same pattern as Invoice).
 */

import { useState } from "react";
import { DataTable } from "@/components/table";
import { CreditCard } from "lucide-react";
import { getBillColumns, type Bill } from "./bill-columns";
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

interface Props {
  bills: Bill[];
  loading: boolean;
  onRefresh: () => void;
  onView?: (bill: Bill) => void;
}

export function BillTable({ bills, loading, onRefresh, onView }: Props) {
  const [payingBill, setPayingBill] = useState<Bill | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const columns = getBillColumns({
    onView: (bill) => {
      onView?.(bill);
    },
    onEdit: (bill) => {
      // Could navigate to edit form — for now toast
      toast.info(`Edit bill ${bill.billNumber} — open detail view to edit`);
    },
    onDelete: async (bill) => {
      if (!confirm(`Delete bill ${bill.billNumber}?`)) return;
      try {
        await api.delete(`/bills/${bill.id}`);
        toast.success("Bill deleted");
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to delete bill");
      }
    },
    onApprove: async (bill) => {
      try {
        await api.post(`/bills/${bill.id}/approve`);
        toast.success(`Bill ${bill.billNumber} approved`);
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to approve bill");
      }
    },
    onRecordPayment: (bill) => {
      setPayingBill(bill);
    },
    onMarkPaid: async (bill) => {
      if (!confirm(`Mark bill ${bill.billNumber} as fully paid? This will post a payment to GL.`)) return;
      try {
        await api.post(`/bills/${bill.id}/mark-paid`);
        toast.success(`Bill ${bill.billNumber} marked as paid`);
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to mark as paid");
      }
    },
    onCancel: async (bill) => {
      if (!confirm(`Cancel bill ${bill.billNumber}? This cannot be undone.`)) return;
      try {
        await api.put(`/bills/${bill.id}`, { status: "cancelled" });
        toast.success("Bill cancelled");
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to cancel");
      }
    },
  });

  return (
    <>
      <DataTable
        columns={columns}
        data={bills}
        searchKey="billNumber"
        searchPlaceholder="Search bills by number..."
        pageSize={20}
        emptyMessage="No bills found. Create your first bill to get started."
        emptyIcon={<CreditCard className="size-10 text-muted-foreground/50 mb-2" />}
      />
      {payingBill && (
        <RecordPaymentDialog
          bill={payingBill}
          onClose={() => setPayingBill(null)}
          onSuccess={() => { setPayingBill(null); onRefresh(); }}
        />
      )}
    </>
  );
}

// ─── Record Payment Dialog ──────────────────────────────────────────────────
function RecordPaymentDialog({ bill, onClose, onSuccess }: { bill: Bill; onClose: () => void; onSuccess: () => void }) {
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
            {(bill.paidAmount || 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Already Paid</span><span className="text-emerald-600">{formatCurrency(bill.paidAmount!)}</span></div>}
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
