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
  onView?: (invoice: Invoice) => void;
  onEdit?: (invoice: Invoice) => void;
}

export function InvoiceTable({ invoices, loading, onRefresh, onView, onEdit }: Props) {
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
      onView?.(inv);
    },
    onEdit: (inv) => {
      onEdit?.(inv);
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
    onDownloadPDF: async (inv) => {
      // Fetch full invoice data with line items + org info
      let fullInvoice = inv;
      let org: any = null;
      try {
        const [invRes, orgRes]: any[] = await Promise.all([
          api.get(`/invoices/${inv.id}`),
          api.get("/settings/organization"),
        ]);
        fullInvoice = invRes.data || invRes || inv;
        org = orgRes;
      } catch {}

      const lineItems = Array.isArray(fullInvoice.lineItems) ? fullInvoice.lineItems : [];
      const customer = (fullInvoice as any).customer;
      const orgName = org?.name || "My Business";
      const orgEmail = org?.email || "";
      const orgPhone = org?.phone || "";
      const orgAddress = typeof org?.address === "string" ? JSON.parse(org.address || "{}") : (org?.address || {});
      const addressLine = [orgAddress.street, orgAddress.city, orgAddress.state, orgAddress.country].filter(Boolean).join(", ");

      const linesHtml = lineItems.map((li: any) =>
        `<tr><td>${li.description || li.name || '—'}</td><td class="text-right">${li.quantity || 1}</td><td class="text-right">${(li.rate || li.unitPrice || 0).toFixed(2)}</td><td class="text-right">${(li.amount || li.total || (li.quantity || 1) * (li.rate || 0)).toFixed(2)}</td></tr>`
      ).join("");

      const html = `<!DOCTYPE html><html><head><title>Invoice ${fullInvoice.invoiceNumber}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;padding:40px;color:#1f2937;font-size:14px}
.header{display:flex;justify-content:space-between;margin-bottom:32px}
.brand{font-size:22px;font-weight:bold;color:#1f2937}
.brand-details{font-size:12px;color:#6b7280;margin-top:4px;line-height:1.6}
.inv-title{font-size:28px;font-weight:bold;color:#374151;text-align:right}
.inv-num{color:#6b7280;font-size:14px}
.meta{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}
.meta-block h4{font-size:12px;text-transform:uppercase;color:#9ca3af;margin-bottom:4px}
table{width:100%;border-collapse:collapse;margin:24px 0}
th{background:#f3f4f6;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280;border-bottom:2px solid #e5e7eb}
td{padding:10px 12px;border-bottom:1px solid #f3f4f6}
.text-right{text-align:right}
.totals{margin-left:auto;width:280px}
.totals-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6}
.totals-row.total{border-top:2px solid #059669;border-bottom:none;font-size:18px;font-weight:bold;padding-top:12px;color:#059669}
.footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:12px}
.status{display:inline-block;padding:4px 12px;border-radius:4px;font-weight:600;font-size:12px;text-transform:uppercase}
.status-draft{background:#f3f4f6;color:#6b7280}.status-sent{background:#dbeafe;color:#1d4ed8}
.status-paid{background:#d1fae5;color:#065f46}.status-overdue{background:#fee2e2;color:#991b1b}
.no-print{margin-bottom:20px}
@media print{.no-print{display:none!important}body{padding:20px}}
</style></head><body>
<div class="no-print" style="text-align:center;padding:12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px">
  <button onclick="if(window.electronAPI){window.electronAPI.printPage()}else{window.print()}" style="padding:8px 24px;background:#059669;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-weight:600">🖨️ Print Invoice</button>
  <button onclick="window.location.href='/'" style="padding:8px 24px;background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;border-radius:6px;font-size:14px;cursor:pointer;margin-left:8px">← Back</button>
</div>
<div class="header">
  <div>
    <div class="brand">${orgName}</div>
    <div class="brand-details">
      ${addressLine ? `${addressLine}<br/>` : ''}${orgPhone ? `Tel: ${orgPhone}<br/>` : ''}${orgEmail ? `Email: ${orgEmail}` : ''}
    </div>
  </div>
  <div style="text-align:right"><div class="inv-title">INVOICE</div><div class="inv-num">${fullInvoice.invoiceNumber}</div>
    <span class="status status-${fullInvoice.status}">${fullInvoice.status}</span>
  </div>
</div>
<div class="meta">
  <div><div class="meta-block"><h4>Bill To</h4><p style="font-weight:600">${customer?.name || 'Walk-in Customer'}</p></div></div>
  <div style="text-align:right">
    <div class="meta-block"><h4>Invoice Date</h4><p>${fullInvoice.invoiceDate || '—'}</p></div>
    <div class="meta-block" style="margin-top:8px"><h4>Due Date</h4><p>${fullInvoice.dueDate || '—'}</p></div>
  </div>
</div>
<table><thead><tr><th>Description</th><th class="text-right">Qty</th><th class="text-right">Rate (GHS)</th><th class="text-right">Amount (GHS)</th></tr></thead>
<tbody>${linesHtml || '<tr><td colspan="4" style="text-align:center;color:#9ca3af">No line items</td></tr>'}</tbody></table>
<div class="totals">
  <div class="totals-row"><span>Subtotal</span><span>${(fullInvoice.subtotal || fullInvoice.totalAmount || 0).toFixed(2)}</span></div>
  ${(fullInvoice.taxAmount || 0) > 0 ? `<div class="totals-row"><span>Tax</span><span>${(fullInvoice.taxAmount || 0).toFixed(2)}</span></div>` : ''}
  <div class="totals-row total"><span>Total</span><span>GHS ${(fullInvoice.totalAmount || 0).toFixed(2)}</span></div>
  ${(fullInvoice.paidAmount || 0) > 0 ? `<div class="totals-row"><span>Paid</span><span style="color:#059669">GHS ${(fullInvoice.paidAmount || 0).toFixed(2)}</span></div>` : ''}
  ${((fullInvoice.totalAmount || 0) - (fullInvoice.paidAmount || 0)) > 0.01 ? `<div class="totals-row"><span style="font-weight:bold">Balance Due</span><span style="color:#dc2626;font-weight:bold">GHS ${((fullInvoice.totalAmount || 0) - (fullInvoice.paidAmount || 0)).toFixed(2)}</span></div>` : ''}
</div>
${fullInvoice.notes ? `<div style="margin-top:24px;padding:12px;background:#f9fafb;border-radius:6px"><p style="font-size:12px;color:#6b7280;margin-bottom:4px">Notes</p><p>${fullInvoice.notes}</p></div>` : ''}
${fullInvoice.terms ? `<div style="margin-top:12px;padding:12px;background:#f9fafb;border-radius:6px"><p style="font-size:12px;color:#6b7280;margin-bottom:4px">Terms & Conditions</p><p style="font-size:12px">${fullInvoice.terms}</p></div>` : ''}
<div class="footer"><p>Thank you for your business!</p></div>
</body></html>`;

      // Navigate current window to print view served via the local server
      // Use Electron's printToPDF via IPC to save a proper PDF
      try {
        await api.post("/settings/temp-print-store", { html });
        if ((window as any).electronAPI?.printToPDF) {
          const result = await (window as any).electronAPI.printToPDF();
          if (result?.success) {
            toast.success(`PDF saved to: ${result.path}`);
          } else {
            toast.error(result?.error || "Failed to generate PDF");
          }
        } else {
          // Dev mode fallback: navigate to preview
          window.location.href = "http://127.0.0.1:45678/print-preview";
        }
      } catch (err: any) {
        toast.error("Print failed: " + (err.message || "Unknown error"));
      }
    },
    onMarkOverdue: async (inv) => {
      try {
        await api.put(`/invoices/${inv.id}`, { status: "overdue" });
        toast.success("Invoice marked as overdue");
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to update");
      }
    },
    onCancel: async (inv) => {
      if (!confirm(`Cancel invoice ${inv.invoiceNumber}? This cannot be undone.`)) return;
      try {
        await api.put(`/invoices/${inv.id}`, { status: "cancelled" });
        toast.success("Invoice cancelled");
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
