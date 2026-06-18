/**
 * Estimate Detail View
 * Shows full estimate info, line items, and all status actions.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ArrowLeft, Send, CheckCircle, XCircle, FileText, Ban, Loader2,
} from "lucide-react";

const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-emerald-100 text-emerald-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-amber-100 text-amber-700",
  converted: "bg-purple-100 text-purple-700",
};

interface Props {
  estimateId: string;
  onBack: () => void;
}

export function EstimateDetail({ estimateId, onBack }: Props) {
  const [estimate, setEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [dueDate, setDueDate] = useState("");

  const fetchEstimate = async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/estimates/${estimateId}`);
      setEstimate(res.data || res);
    } catch {
      toast.error("Failed to load estimate");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEstimate(); }, [estimateId]);

  const handleAction = async (action: string, endpoint: string, body?: any) => {
    setActionLoading(action);
    try {
      await api.post(`/estimates/${estimateId}/${endpoint}`, body || {});
      toast.success(`Estimate ${action} successfully`);
      fetchEstimate();
    } catch (e: any) {
      toast.error(e.message || `Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConvert = async () => {
    if (!dueDate) { toast.error("Please select a due date"); return; }
    setActionLoading("convert");
    try {
      await api.post(`/estimates/${estimateId}/convert`, { dueDate });
      toast.success("Estimate converted to draft invoice! Check the Invoices page.");
      setShowConvertDialog(false);
      fetchEstimate();
    } catch (e: any) {
      toast.error(e.message || "Failed to convert");
    } finally {
      setActionLoading(null);
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

  if (!estimate) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
        <p className="text-muted-foreground">Estimate not found.</p>
      </div>
    );
  }

  const lineItems = Array.isArray(estimate.lineItems) ? estimate.lineItems : [];
  const canSend = estimate.status === "draft";
  const canAcceptDecline = estimate.status === "sent";
  const canConvert = !["declined", "expired", "converted"].includes(estimate.status);
  const canVoid = !["converted", "voided"].includes(estimate.status);

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
              <h1 className="text-2xl font-bold">{estimate.estimateNumber}</h1>
              <Badge className={statusStyles[estimate.status] || ""}>{estimate.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{estimate.customerName || "No customer"}</p>
          </div>
        </div>
        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {canSend && (
            <Button size="sm" onClick={() => handleAction("sent", "send")} disabled={!!actionLoading}>
              {actionLoading === "sent" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Mark as Sent
            </Button>
          )}
          {canAcceptDecline && (
            <>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAction("accepted", "accept")} disabled={!!actionLoading}>
                {actionLoading === "accepted" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                Accept
              </Button>
              <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => handleAction("declined", "decline")} disabled={!!actionLoading}>
                {actionLoading === "declined" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                Decline
              </Button>
            </>
          )}
          {canConvert && (
            <Button size="sm" variant="outline" onClick={() => { setShowConvertDialog(true); setDueDate(""); }} disabled={!!actionLoading}>
              <FileText className="h-4 w-4 mr-1" />
              Convert to Invoice
            </Button>
          )}
          {canVoid && (
            <Button size="sm" variant="outline" className="text-amber-600 border-amber-200" onClick={() => handleAction("voided", "void")} disabled={!!actionLoading}>
              <Ban className="h-4 w-4 mr-1" />
              Void
            </Button>
          )}
        </div>
      </div>
      <Separator />

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Estimate Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Estimate Number</span><span className="font-mono font-medium">{estimate.estimateNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{formatDate(estimate.estimateDate)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Expiry Date</span><span>{estimate.expiryDate ? formatDate(estimate.expiryDate) : "No expiry"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{estimate.customerName || estimate.customer?.name || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge className={statusStyles[estimate.status] || ""}>{estimate.status}</Badge></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Amount Summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(estimate.subtotal || estimate.totalAmount || 0)}</span></div>
            {(estimate.taxAmount || 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatCurrency(estimate.taxAmount)}</span></div>}
            <Separator />
            <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-emerald-600">{formatCurrency(estimate.totalAmount || 0)}</span></div>
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

      {/* Notes & Terms */}
      {(estimate.notes || estimate.terms) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {estimate.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{estimate.notes}</p></CardContent>
            </Card>
          )}
          {estimate.terms && (
            <Card>
              <CardHeader><CardTitle className="text-base">Terms & Conditions</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{estimate.terms}</p></CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Convert to Invoice Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convert to Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Converting <span className="font-medium text-foreground">{estimate.estimateNumber}</span> will create a new draft invoice with all line items copied over.
            </p>
            <div className="space-y-2">
              <Label>Invoice Due Date *</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertDialog(false)} disabled={!!actionLoading}>Cancel</Button>
            <Button onClick={handleConvert} disabled={!!actionLoading} className="bg-emerald-600 hover:bg-emerald-700">
              {actionLoading === "convert" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              {actionLoading === "convert" ? "Converting..." : "Convert to Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
