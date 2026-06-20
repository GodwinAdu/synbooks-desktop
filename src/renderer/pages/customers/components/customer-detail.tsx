/**
 * Customer Detail Dialog
 * Shows customer info + transaction history (invoices, payments, credit notes).
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { User, Mail, Phone, MapPin, FileText, DollarSign, Receipt } from "lucide-react";

interface CustomerDetailProps {
  open: boolean;
  onClose: () => void;
  customer: any;
}

export function CustomerDetail({ open, onClose, customer }: CustomerDetailProps) {
  const [transactions, setTransactions] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !customer?.id) return;
    setLoading(true);
    api.get(`/customers/${customer.id}/transactions`)
      .then((res: any) => setTransactions(res))
      .catch(() => setTransactions(null))
      .finally(() => setLoading(false));
  }, [open, customer?.id]);

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="md:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{customer.name}</DialogTitle>
        </DialogHeader>

        {/* Customer Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {customer.email && <InfoItem icon={Mail} label="Email" value={customer.email} />}
          {customer.phone && <InfoItem icon={Phone} label="Phone" value={customer.phone} />}
          {customer.address && <InfoItem icon={MapPin} label="Address" value={customer.address} />}
          {customer.customerNumber && <InfoItem icon={User} label="ID" value={customer.customerNumber} />}
        </div>

        <Separator />

        {/* Summary Cards */}
        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : transactions ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Invoiced</p><p className="text-lg font-bold">{formatCurrency(transactions.summary.totalInvoiced)}</p></CardContent></Card>
              <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Paid</p><p className="text-lg font-bold text-emerald-600">{formatCurrency(transactions.summary.totalPaid)}</p></CardContent></Card>
              <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-lg font-bold text-amber-600">{formatCurrency(transactions.summary.totalOutstanding)}</p></CardContent></Card>
            </div>

            {/* Invoices */}
            {transactions.invoices.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-blue-600" /> Invoices ({transactions.invoices.length})</p>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/50"><th className="text-left py-2 px-3 font-medium">Invoice #</th><th className="text-left py-2 px-3 font-medium">Date</th><th className="text-right py-2 px-3 font-medium">Amount</th><th className="text-left py-2 px-3 font-medium">Status</th></tr></thead>
                    <tbody>
                      {transactions.invoices.slice(0, 10).map((inv: any) => (
                        <tr key={inv.id} className="border-b"><td className="py-2 px-3 font-mono text-xs">{inv.invoiceNumber}</td><td className="py-2 px-3 text-muted-foreground text-xs">{inv.invoiceDate?.split("T")[0]}</td><td className="py-2 px-3 text-right tabular-nums">{formatCurrency(inv.totalAmount)}</td><td className="py-2 px-3"><Badge variant="outline" className="text-[10px]">{inv.status}</Badge></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payments */}
            {transactions.payments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-600" /> Payments ({transactions.payments.length})</p>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/50"><th className="text-left py-2 px-3 font-medium">Payment #</th><th className="text-left py-2 px-3 font-medium">Date</th><th className="text-right py-2 px-3 font-medium">Amount</th><th className="text-left py-2 px-3 font-medium">Method</th></tr></thead>
                    <tbody>
                      {transactions.payments.slice(0, 10).map((p: any) => (
                        <tr key={p.id} className="border-b"><td className="py-2 px-3 font-mono text-xs">{p.paymentNumber}</td><td className="py-2 px-3 text-muted-foreground text-xs">{p.paymentDate?.split("T")[0]}</td><td className="py-2 px-3 text-right tabular-nums text-emerald-600">{formatCurrency(p.amount)}</td><td className="py-2 px-3 text-xs capitalize">{p.paymentMethod?.replace("_", " ")}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Credit Notes */}
            {transactions.creditNotes.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2"><Receipt className="h-4 w-4 text-red-600" /> Credit Notes ({transactions.creditNotes.length})</p>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/50"><th className="text-left py-2 px-3 font-medium">CN #</th><th className="text-left py-2 px-3 font-medium">Date</th><th className="text-right py-2 px-3 font-medium">Amount</th><th className="text-left py-2 px-3 font-medium">Status</th></tr></thead>
                    <tbody>
                      {transactions.creditNotes.map((cn: any) => (
                        <tr key={cn.id} className="border-b"><td className="py-2 px-3 font-mono text-xs">{cn.creditNoteNumber}</td><td className="py-2 px-3 text-muted-foreground text-xs">{cn.issueDate?.split("T")[0]}</td><td className="py-2 px-3 text-right tabular-nums text-red-600">{formatCurrency(cn.totalAmount)}</td><td className="py-2 px-3"><Badge variant="outline" className="text-[10px]">{cn.status}</Badge></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {transactions.invoices.length === 0 && transactions.payments.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No transactions found for this customer.</p>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0"><p className="text-[10px] text-muted-foreground">{label}</p><p className="text-xs truncate">{value}</p></div>
    </div>
  );
}
