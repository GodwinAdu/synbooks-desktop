/**
 * Sales Order Detail View
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
  ArrowLeft, CheckCircle, FileText, XCircle, Trash2, Loader2,
} from "lucide-react";

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  confirmed: "bg-blue-100 text-blue-700",
  fulfilled: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

interface Props {
  orderId: string;
  onBack: () => void;
}

export function SalesOrderDetail({ orderId, onBack }: Props) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/sales-orders/${orderId}`);
      setOrder(res.data || res);
    } catch {
      toast.error("Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrder(); }, [orderId]);

  const handleConfirm = async () => {
    setActionLoading("confirm");
    try {
      await api.post(`/sales-orders/${orderId}/confirm`);
      toast.success("Order confirmed");
      fetchOrder();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setActionLoading(null); }
  };

  const handleConvert = async () => {
    if (!confirm("Convert this order to a draft invoice?")) return;
    setActionLoading("convert");
    try {
      const res: any = await api.post(`/sales-orders/${orderId}/convert`);
      toast.success(res.message || "Order converted to invoice");
      fetchOrder();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setActionLoading(null); }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this order? This cannot be undone.")) return;
    setActionLoading("cancel");
    try {
      await api.post(`/sales-orders/${orderId}/cancel`);
      toast.success("Order cancelled");
      fetchOrder();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this order?")) return;
    setActionLoading("delete");
    try {
      await api.delete(`/sales-orders/${orderId}`);
      toast.success("Order deleted");
      onBack();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setActionLoading(null); }
  };

  if (loading) {
    return <div className="p-6 space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!order) {
    return <div className="p-6"><Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button><p className="text-muted-foreground mt-4">Not found.</p></div>;
  }

  const lineItems = Array.isArray(order.lineItems) ? order.lineItems : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
              <Badge className={statusStyles[order.status] || ""}>{order.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{order.customerName || "No customer"}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {order.status === "draft" && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleConfirm} disabled={!!actionLoading}>
              {actionLoading === "confirm" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
              Confirm Order
            </Button>
          )}
          {order.status === "confirmed" && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleConvert} disabled={!!actionLoading}>
              {actionLoading === "convert" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
              Convert to Invoice
            </Button>
          )}
          {(order.status === "draft" || order.status === "confirmed") && (
            <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={handleCancel} disabled={!!actionLoading}>
              {actionLoading === "cancel" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
              Cancel
            </Button>
          )}
          {order.status === "draft" && (
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
          <CardHeader><CardTitle className="text-base">Order Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Order Number</span><span className="font-mono font-medium">{order.orderNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Order Date</span><span>{formatDate(order.orderDate)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery Date</span><span>{order.deliveryDate ? formatDate(order.deliveryDate) : "Not set"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{order.customerName || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={statusStyles[order.status] || ""}>{order.status}</Badge></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Amount</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(order.subtotal || order.totalAmount || 0)}</span></div>
            {(order.taxAmount || 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(order.taxAmount)}</span></div>}
            <Separator />
            <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-emerald-600">{formatCurrency(order.totalAmount || 0)}</span></div>
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
                  <TableHead className="text-right">Tax %</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map((li: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{li.description || "—"}</TableCell>
                    <TableCell className="text-right">{li.quantity || 1}</TableCell>
                    <TableCell className="text-right">{formatCurrency(li.rate || li.unitPrice || 0)}</TableCell>
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

      {/* Notes */}
      {order.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
