/**
 * Vendor Detail Dialog
 * Shows vendor info + transaction history (bills, expenses, purchase orders).
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Store, Mail, Phone, MapPin, CreditCard, Receipt, ShoppingBag } from "lucide-react";

interface VendorDetailProps {
  open: boolean;
  onClose: () => void;
  vendor: any;
}

export function VendorDetail({ open, onClose, vendor }: VendorDetailProps) {
  const [transactions, setTransactions] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !vendor?.id) return;
    setLoading(true);
    api.get(`/vendors/${vendor.id}/transactions`)
      .then((res: any) => setTransactions(res))
      .catch(() => setTransactions(null))
      .finally(() => setLoading(false));
  }, [open, vendor?.id]);

  if (!vendor) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="md:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{vendor.name}</DialogTitle>
        </DialogHeader>

        {/* Vendor Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {vendor.email && <InfoItem icon={Mail} label="Email" value={vendor.email} />}
          {vendor.phone && <InfoItem icon={Phone} label="Phone" value={vendor.phone} />}
          {vendor.address && <InfoItem icon={MapPin} label="Address" value={vendor.address} />}
          {vendor.vendorNumber && <InfoItem icon={Store} label="ID" value={vendor.vendorNumber} />}
        </div>

        <Separator />

        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : transactions ? (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Billed</p><p className="text-lg font-bold">{formatCurrency(transactions.summary.totalBilled)}</p></CardContent></Card>
              <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Total Paid</p><p className="text-lg font-bold text-emerald-600">{formatCurrency(transactions.summary.totalPaid)}</p></CardContent></Card>
              <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-lg font-bold text-amber-600">{formatCurrency(transactions.summary.totalOutstanding)}</p></CardContent></Card>
              <Card><CardContent className="pt-4 pb-3"><p className="text-xs text-muted-foreground">Expenses</p><p className="text-lg font-bold text-orange-600">{formatCurrency(transactions.summary.totalExpenses)}</p></CardContent></Card>
            </div>

            {/* Bills */}
            {transactions.bills.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4 text-blue-600" /> Bills ({transactions.bills.length})</p>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/50"><th className="text-left py-2 px-3 font-medium">Bill #</th><th className="text-left py-2 px-3 font-medium">Date</th><th className="text-right py-2 px-3 font-medium">Amount</th><th className="text-right py-2 px-3 font-medium">Paid</th><th className="text-left py-2 px-3 font-medium">Status</th></tr></thead>
                    <tbody>
                      {transactions.bills.slice(0, 10).map((b: any) => (
                        <tr key={b.id} className="border-b"><td className="py-2 px-3 font-mono text-xs">{b.billNumber}</td><td className="py-2 px-3 text-muted-foreground text-xs">{b.billDate?.split("T")[0]}</td><td className="py-2 px-3 text-right tabular-nums">{formatCurrency(b.totalAmount)}</td><td className="py-2 px-3 text-right tabular-nums text-emerald-600">{formatCurrency(b.paidAmount || 0)}</td><td className="py-2 px-3"><Badge variant="outline" className="text-[10px]">{b.status}</Badge></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Expenses */}
            {transactions.expenses.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2"><Receipt className="h-4 w-4 text-orange-600" /> Expenses ({transactions.expenses.length})</p>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/50"><th className="text-left py-2 px-3 font-medium">Expense #</th><th className="text-left py-2 px-3 font-medium">Date</th><th className="text-right py-2 px-3 font-medium">Amount</th><th className="text-left py-2 px-3 font-medium">Status</th></tr></thead>
                    <tbody>
                      {transactions.expenses.slice(0, 10).map((e: any) => (
                        <tr key={e.id} className="border-b"><td className="py-2 px-3 font-mono text-xs">{e.expenseNumber}</td><td className="py-2 px-3 text-muted-foreground text-xs">{e.date?.split("T")[0]}</td><td className="py-2 px-3 text-right tabular-nums">{formatCurrency(e.amount)}</td><td className="py-2 px-3"><Badge variant="outline" className="text-[10px]">{e.status}</Badge></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Purchase Orders */}
            {transactions.purchaseOrders.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-purple-600" /> Purchase Orders ({transactions.purchaseOrders.length})</p>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/50"><th className="text-left py-2 px-3 font-medium">PO #</th><th className="text-left py-2 px-3 font-medium">Date</th><th className="text-right py-2 px-3 font-medium">Amount</th><th className="text-left py-2 px-3 font-medium">Status</th></tr></thead>
                    <tbody>
                      {transactions.purchaseOrders.map((po: any) => (
                        <tr key={po.id} className="border-b"><td className="py-2 px-3 font-mono text-xs">{po.poNumber}</td><td className="py-2 px-3 text-muted-foreground text-xs">{po.orderDate?.split("T")[0]}</td><td className="py-2 px-3 text-right tabular-nums">{formatCurrency(po.totalAmount)}</td><td className="py-2 px-3"><Badge variant="outline" className="text-[10px]">{po.status}</Badge></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {transactions.bills.length === 0 && transactions.expenses.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No transactions found for this vendor.</p>
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
