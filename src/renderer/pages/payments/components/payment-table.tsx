import { DataTable } from "@/components/table";
import { DollarSign } from "lucide-react";
import { getPaymentColumns } from "./payment-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PaymentReceived } from "../types";

interface Props {
  payments: PaymentReceived[];
  loading: boolean;
  onRefresh: () => void;
  onView?: (payment: PaymentReceived) => void;
}

export function PaymentTable({ payments, loading, onRefresh, onView }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const handleDownload = async (payment: PaymentReceived) => {
    // Fetch org info for the receipt
    let org: any = {};
    try { org = await api.get("/settings/organization"); } catch {}

    const orgName = org?.name || "My Business";
    const orgEmail = org?.email || "";
    const orgPhone = org?.phone || "";
    const orgAddress = typeof org?.address === "string" ? JSON.parse(org.address || "{}") : (org?.address || {});
    const addressLine = [orgAddress.street, orgAddress.city, orgAddress.state, orgAddress.country].filter(Boolean).join(", ");

    const html = `<!DOCTYPE html><html><head><title>Receipt ${payment.paymentNumber}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;padding:40px;color:#1f2937;font-size:14px;max-width:600px;margin:0 auto}
.header{text-align:center;margin-bottom:32px;padding-bottom:16px;border-bottom:2px solid #059669}
.brand{font-size:22px;font-weight:bold;color:#1f2937}
.brand-details{font-size:11px;color:#6b7280;margin-top:4px}
.title{font-size:24px;font-weight:bold;color:#059669;margin:24px 0 8px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:20px 0}
.info-item label{font-size:11px;text-transform:uppercase;color:#9ca3af;display:block;margin-bottom:2px}
.info-item p{font-size:14px;font-weight:500}
.amount-box{text-align:center;background:#f0fdf4;border:2px solid #bbf7d0;border-radius:12px;padding:24px;margin:24px 0}
.amount{font-size:32px;font-weight:bold;color:#059669}
.footer{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center;color:#9ca3af;font-size:11px}
.no-print{text-align:center;margin-bottom:20px}
@media print{.no-print{display:none!important}}
</style></head><body>
<div class="no-print">
  <button onclick="if(window.electronAPI){window.electronAPI.printToPDF()}else{window.print()}" style="padding:8px 24px;background:#059669;color:white;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-weight:600">🖨️ Print Receipt</button>
  <button onclick="window.location.href='/'" style="padding:8px 24px;background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;border-radius:6px;font-size:14px;cursor:pointer;margin-left:8px">← Back</button>
</div>
<div class="header">
  <div class="brand">${orgName}</div>
  <div class="brand-details">${addressLine ? addressLine + '<br/>' : ''}${orgPhone ? 'Tel: ' + orgPhone : ''}${orgEmail ? ' • ' + orgEmail : ''}</div>
</div>
<div class="title">PAYMENT RECEIPT</div>
<div class="info-grid">
  <div class="info-item"><label>Receipt No.</label><p>${payment.paymentNumber}</p></div>
  <div class="info-item"><label>Date</label><p>${formatDate(payment.paymentDate)}</p></div>
  <div class="info-item"><label>Customer</label><p>${payment.customerName || 'Walk-in'}</p></div>
  <div class="info-item"><label>Payment Method</label><p style="text-transform:capitalize">${(payment.paymentMethod || 'cash').replace('_', ' ')}</p></div>
  ${payment.referenceNumber ? `<div class="info-item"><label>Reference</label><p>${payment.referenceNumber}</p></div>` : ''}
  ${payment.invoiceNumber ? `<div class="info-item"><label>Invoice</label><p>${payment.invoiceNumber}</p></div>` : ''}
</div>
<div class="amount-box">
  <p style="font-size:12px;color:#6b7280;margin-bottom:4px">Amount Received</p>
  <div class="amount">GHS ${(payment.amount || 0).toFixed(2)}</div>
</div>
${payment.notes ? `<div style="margin:16px 0;padding:12px;background:#f9fafb;border-radius:6px"><p style="font-size:11px;color:#6b7280;margin-bottom:2px">Notes</p><p style="font-size:13px">${payment.notes}</p></div>` : ''}
<div class="footer">
  <p>Thank you for your payment!</p>
  <p style="margin-top:4px">This is a computer-generated receipt.</p>
</div>
</body></html>`;

    try {
      await api.post("/settings/temp-print-store", { html });
      if ((window as any).electronAPI?.printToPDF) {
        const result = await (window as any).electronAPI.printToPDF();
        if (result?.success) {
          toast.success(`Receipt saved to: ${result.path}`);
        } else {
          toast.error(result?.error || "Failed to generate PDF");
        }
      } else {
        window.location.href = "http://127.0.0.1:45678/print-preview";
      }
    } catch {
      toast.error("Failed to generate receipt");
    }
  };

  const columns = getPaymentColumns({
    onView: (payment) => onView?.(payment),
    onDownload: handleDownload,
    onRefund: async (payment) => {
      if (!confirm(`Refund ${formatCurrency(payment.amount)} for ${payment.paymentNumber}?`)) return;
      try {
        await api.put(`/payments/${payment.id}`, { status: "refunded" });
        toast.success("Payment marked as refunded");
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to refund");
      }
    },
    onDelete: async (payment) => {
      if (!confirm(`Delete payment ${payment.paymentNumber}?`)) return;
      try {
        await api.delete(`/payments/${payment.id}`);
        toast.success("Payment deleted");
        onRefresh();
      } catch (e: any) {
        toast.error(e.message || "Failed to delete");
      }
    },
  });

  return (
    <DataTable
      columns={columns}
      data={payments}
      searchKey="paymentNumber"
      searchPlaceholder="Search payments..."
      pageSize={20}
      emptyMessage="No payments recorded yet. Click 'Record Payment' to get started."
      emptyIcon={<DollarSign className="size-10 text-muted-foreground/50 mb-2" />}
    />
  );
}
