/**
 * Payment Create Form
 * Record a payment received from a customer, optionally linked to an invoice.
 */

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

interface Props {
  onBack: () => void;
}

const paymentMethods = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
];

export function PaymentCreateForm({ onBack }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<any[]>([]);

  const [form, setForm] = useState({
    customerId: "",
    invoiceId: "",
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "bank_transfer",
    referenceNumber: "",
    notes: "",
  });

  useEffect(() => {
    api.get("/customers", { pageSize: 500 }).then((res: any) => setCustomers(res.data || [])).catch(() => {});
    api.get("/invoices", { pageSize: 500, status: "sent" }).then((res: any) => {
      const unpaid = (res.data || []).filter((inv: any) => inv.status !== "paid" && inv.status !== "cancelled");
      setInvoices(unpaid);
    }).catch(() => {});
  }, []);

  // Filter invoices by selected customer
  useEffect(() => {
    if (form.customerId) {
      setFilteredInvoices(invoices.filter(inv => inv.customerId === form.customerId));
    } else {
      setFilteredInvoices(invoices);
    }
  }, [form.customerId, invoices]);

  // When invoice is selected, auto-fill amount
  const handleInvoiceSelect = (invoiceId: string) => {
    setForm(prev => ({ ...prev, invoiceId }));
    if (invoiceId) {
      const inv = invoices.find(i => i.id === invoiceId);
      if (inv) {
        const balance = (inv.totalAmount || 0) - (inv.paidAmount || 0);
        setForm(prev => ({ ...prev, amount: balance.toFixed(2) }));
        // Auto-select customer if not already selected
        if (!form.customerId && inv.customerId) {
          setForm(prev => ({ ...prev, customerId: inv.customerId }));
        }
      }
    }
  };

  const handleSubmit = async () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/payments", {
        customerId: form.customerId || undefined,
        invoiceId: form.invoiceId || undefined,
        amount,
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        referenceNumber: form.referenceNumber || undefined,
        paymentType: "received",
        notes: form.notes || undefined,
      });
      toast.success("Payment recorded successfully");
      onBack();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedInvoice = invoices.find(i => i.id === form.invoiceId);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold">Record Payment Received</h1>
          <p className="text-sm text-muted-foreground">Record a payment from a customer</p>
        </div>
      </div>
      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Invoice */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>Link payment to a customer and optionally an invoice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <select
                    value={form.customerId}
                    onChange={e => setForm(prev => ({ ...prev, customerId: e.target.value, invoiceId: "" }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    <option value="">Select customer (optional)</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Apply to Invoice</Label>
                  <select
                    value={form.invoiceId}
                    onChange={e => handleInvoiceSelect(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    <option value="">No invoice (standalone payment)</option>
                    {filteredInvoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — Balance: {formatCurrency((inv.totalAmount || 0) - (inv.paidAmount || 0))}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedInvoice && (
                <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><span className="font-mono">{selectedInvoice.invoiceNumber}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span>{formatCurrency(selectedInvoice.totalAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Already Paid</span><span className="text-emerald-600">{formatCurrency(selectedInvoice.paidAmount || 0)}</span></div>
                  <div className="flex justify-between font-semibold border-t pt-1"><span>Outstanding</span><span className="text-orange-600">{formatCurrency((selectedInvoice.totalAmount || 0) - (selectedInvoice.paidAmount || 0))}</span></div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Amount & Method */}
          <Card>
            <CardHeader><CardTitle>Amount & Method</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (GHS) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.amount}
                    onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Date *</Label>
                  <Input
                    type="date"
                    value={form.paymentDate}
                    onChange={e => setForm(prev => ({ ...prev, paymentDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <select
                    value={form.paymentMethod}
                    onChange={e => setForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    {paymentMethods.map(pm => <option key={pm.value} value={pm.value}>{pm.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Reference / Transaction ID</Label>
                  <Input
                    value={form.referenceNumber}
                    onChange={e => setForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                    placeholder="e.g. TXN-12345"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground uppercase">Payment Amount</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{formatCurrency(parseFloat(form.amount) || 0)}</p>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Method</span><span className="capitalize">{form.paymentMethod.replace("_", " ")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{form.paymentDate}</span></div>
                {form.invoiceId && <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><Badge variant="outline" className="font-mono text-xs">{selectedInvoice?.invoiceNumber}</Badge></div>}
              </div>
              <Separator />
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Record Payment
              </Button>
              <Button variant="outline" className="w-full" onClick={onBack} disabled={submitting}>
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
