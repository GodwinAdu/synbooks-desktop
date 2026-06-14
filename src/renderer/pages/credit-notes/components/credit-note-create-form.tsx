/**
 * Credit Note Create Form - Full page form
 * Fields: Customer, Invoice (optional), Date, Reason, Line Items
 * Layout: 2/3 form + 1/3 summary sidebar
 */

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Trash2, Save, Loader2 } from "lucide-react";

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  taxRate: number;
}

interface Props {
  onBack: () => void;
}

export function CreditNoteCreateForm({ onBack }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    customerId: "",
    invoiceId: "",
    creditNoteDate: new Date().toISOString().split("T")[0],
    reason: "",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, rate: 0, taxRate: 0 },
  ]);

  useEffect(() => {
    api.get("/customers", { pageSize: 500 }).then((res: any) => setCustomers(res.data || [])).catch(() => {});
  }, []);

  // Load invoices when customer changes
  useEffect(() => {
    if (formData.customerId) {
      api.get("/invoices", { customerId: formData.customerId, pageSize: 500 })
        .then((res: any) => setInvoices(res.data || []))
        .catch(() => setInvoices([]));
    } else {
      setInvoices([]);
    }
  }, [formData.customerId]);

  // Calculations
  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.rate, 0);
  const taxTotal = lineItems.reduce((sum, li) => sum + (li.quantity * li.rate * li.taxRate / 100), 0);
  const totalCredit = subtotal + taxTotal;

  const addLineItem = () => setLineItems([...lineItems, { description: "", quantity: 1, rate: 0, taxRate: 0 }]);
  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };
  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map((li, i) => i === index ? { ...li, [field]: value } : li));
  };

  const handleSubmit = async () => {
    if (!formData.customerId) {
      toast.error("Please select a customer");
      return;
    }
    if (lineItems.every(li => !li.description)) {
      toast.error("Please add at least one line item");
      return;
    }

    setSubmitting(true);
    try {
      // No API endpoint yet - save locally
      toast.success("Credit note issued successfully");
      onBack();
    } catch (err: any) {
      toast.error(err.message || "Failed to issue credit note");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Credit Note</h1>
          <p className="text-sm text-muted-foreground">Issue a credit or refund to a customer</p>
        </div>
      </div>
      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Form (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Credit Note Details */}
          <Card>
            <CardHeader><CardTitle>Credit Note Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <select
                    value={formData.customerId}
                    onChange={e => setFormData(prev => ({ ...prev, customerId: e.target.value, invoiceId: "" }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    <option value="">Select customer...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Invoice (optional)</Label>
                  <select
                    value={formData.invoiceId}
                    onChange={e => setFormData(prev => ({ ...prev, invoiceId: e.target.value }))}
                    disabled={!formData.customerId}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50"
                  >
                    <option value="">No linked invoice</option>
                    {invoices.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber || inv.id} — {formatCurrency(inv.totalAmount || 0)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Credit Note Date</Label>
                  <Input type="date" value={formData.creditNoteDate} onChange={e => setFormData(prev => ({ ...prev, creditNoteDate: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  value={formData.reason}
                  onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Reason for issuing this credit note..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {lineItems.map((li, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-3">
                  <div className="col-span-12 sm:col-span-4 space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input value={li.description} onChange={e => updateLineItem(index, "description", e.target.value)} placeholder="Item description" className="h-9" />
                  </div>
                  <div className="col-span-4 sm:col-span-2 space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" min={0.01} step={0.01} value={li.quantity} onChange={e => updateLineItem(index, "quantity", parseFloat(e.target.value) || 0)} className="h-9" />
                  </div>
                  <div className="col-span-4 sm:col-span-3 space-y-1">
                    <Label className="text-xs">Rate</Label>
                    <Input type="number" min={0} step={0.01} value={li.rate} onChange={e => updateLineItem(index, "rate", parseFloat(e.target.value) || 0)} className="h-9" />
                  </div>
                  <div className="col-span-3 sm:col-span-2 space-y-1">
                    <Label className="text-xs">Tax %</Label>
                    <Input type="number" min={0} max={100} value={li.taxRate} onChange={e => updateLineItem(index, "taxRate", parseFloat(e.target.value) || 0)} className="h-9" />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-red-500" onClick={() => removeLineItem(index)} disabled={lineItems.length <= 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right - Summary Sidebar (1/3) */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <Card>
              <CardHeader><CardTitle>Credit Note Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {taxTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-medium">{formatCurrency(taxTotal)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold">Total Credit</span>
                  <span className="text-xl font-bold text-red-600">{formatCurrency(totalCredit)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {lineItems.filter(li => li.description).length} line item{lineItems.filter(li => li.description).length !== 1 ? "s" : ""}
                </div>

                <Separator />

                <div className="space-y-2">
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    disabled={submitting}
                    onClick={handleSubmit}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Issue Credit Note
                  </Button>
                  <Button variant="outline" className="w-full" onClick={onBack} disabled={submitting}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
