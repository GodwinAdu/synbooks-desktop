/**
 * Payment Detail View
 * Full payment receipt view with actions.
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
import { ArrowLeft, FileDown, RotateCcw, Loader2 } from "lucide-react";
import type { PaymentReceived } from "../types";

const statusStyles: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  refunded: "bg-red-100 text-red-700",
};

interface Props {
  paymentId: string;
  onBack: () => void;
}

export function PaymentDetail({ paymentId, onBack }: Props) {
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPayment = async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/payments/${paymentId}`);
      setPayment(res.data || res);
    } catch {
      toast.error("Failed to load payment");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayment(); }, [paymentId]);

  const handleRefund = async () => {
    if (!confirm(`Refund ${formatCurrency(payment.amount)} for ${payment.paymentNumber}?`)) return;
    setActionLoading(true);
    try {
      await api.put(`/payments/${paymentId}`, { status: "refunded" });
      toast.success("Payment refunded");
      fetchPayment();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
        <p className="text-muted-foreground">Payment not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{payment.paymentNumber}</h1>
              <Badge className={statusStyles[payment.status] || ""}>{payment.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{payment.customerName || "Walk-in Customer"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {payment.status === "completed" && (
            <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={handleRefund} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-1" />}
              Refund
            </Button>
          )}
        </div>
      </div>
      <Separator />

      {/* Amount Card */}
      <Card className="border-2 border-emerald-200 dark:border-emerald-800">
        <CardContent className="pt-8 pb-8 text-center">
          <p className="text-sm text-muted-foreground uppercase tracking-wide">Amount Received</p>
          <p className="text-4xl font-bold text-emerald-600 mt-2">{formatCurrency(payment.amount)}</p>
          <p className="text-sm text-muted-foreground mt-2">
            {formatDate(payment.paymentDate)} • <span className="capitalize">{(payment.paymentMethod || "cash").replace("_", " ")}</span>
          </p>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader><CardTitle className="text-base">Payment Details</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground">Receipt Number</p>
              <p className="font-mono font-medium">{payment.paymentNumber}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">{formatDate(payment.paymentDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Customer</p>
              <p className="font-medium">{payment.customerName || "Walk-in"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Payment Method</p>
              <p className="font-medium capitalize">{(payment.paymentMethod || "cash").replace("_", " ")}</p>
            </div>
            {payment.referenceNumber && (
              <div>
                <p className="text-muted-foreground">Reference / Transaction ID</p>
                <p className="font-mono font-medium">{payment.referenceNumber}</p>
              </div>
            )}
            {payment.invoiceNumber && (
              <div>
                <p className="text-muted-foreground">Applied to Invoice</p>
                <p className="font-mono font-medium">{payment.invoiceNumber}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">Status</p>
              <Badge className={statusStyles[payment.status] || ""}>{payment.status}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Recorded On</p>
              <p className="font-medium">{payment.createdAt ? formatDate(payment.createdAt) : "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {payment.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{payment.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
