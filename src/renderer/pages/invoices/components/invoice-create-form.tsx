/**
 * Invoice Create Form - Full page form matching Next.js version
 * Features: Customer select, line items with product, payment terms,
 * discount, tax, notes/terms, live summary sidebar
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
import { ArrowLeft, Plus, Trash2, Save, Send, Loader2 } from "lucide-react";

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  taxRate: number;
  productId?: string;
}

interface Props {
  onBack: () => void;
  initialData?: any; // For edit mode
}

const paymentTermsOptions = [
  { value: "due_on_receipt", label: "Due on Receipt" },
  { value: "net_7", label: "Net 7 Days" },
  { value: "net_15", label: "Net 15 Days" },
  { value: "net_30", label: "Net 30 Days" },
  { value: "net_45", label: "Net 45 Days" },
  { value: "net_60", label: "Net 60 Days" },
  { value: "net_90", label: "Net 90 Days" },
  { value: "custom", label: "Custom" },
];

export function InvoiceCreateForm({ onBack, initialData }: Props) {
  const isEdit = !!initialData;
  const [submitting, setSubmitting] = useState<"draft" | "send" | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    customerId: initialData?.customerId || "",
    invoiceDate: initialData?.invoiceDate?.split("T")[0] || new Date().toISOString().split("T")[0],
    dueDate: initialData?.dueDate?.split("T")[0] || "",
    paymentTerms: "net_30",
    discount: 0,
    discountType: "percentage" as "percentage" | "fixed",
    notes: initialData?.notes || "",
    terms: initialData?.terms || "",
    revenueAccountId: initialData?.revenueAccountId || "",
    receivableAccountId: initialData?.receivableAccountId || "",
    taxAccountId: initialData?.taxAccountId || "",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>(
    initialData?.lineItems?.length > 0
      ? initialData.lineItems.map((li: any) => ({ description: li.description, quantity: li.quantity, rate: li.rate, taxRate: li.taxRate || 0, productId: li.productId }))
      : [{ description: "", quantity: 1, rate: 0, taxRate: 0 }]
  );

  // Load customers, products, and accounts
  useEffect(() => {
    api.get("/customers", { pageSize: 500 }).then((res: any) => setCustomers(res.data || [])).catch(() => {});
    api.get("/products", { pageSize: 500 }).then((res: any) => setProducts(res.data || [])).catch(() => {});
    api.get("/accounts", { pageSize: 500 }).then((res: any) => setAccounts(Array.isArray(res) ? res : res.data || [])).catch(() => {});
  }, []);

  // Calculations
  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.rate, 0);
  const taxTotal = lineItems.reduce((sum, li) => sum + (li.quantity * li.rate * li.taxRate / 100), 0);
  const discountAmount = formData.discountType === "percentage" ? subtotal * formData.discount / 100 : formData.discount;
  const totalAmount = subtotal + taxTotal - discountAmount;

  const addLineItem = () => setLineItems([...lineItems, { description: "", quantity: 1, rate: 0, taxRate: 0 }]);
  const removeLineItem = (index: number) => { if (lineItems.length <= 1) return; setLineItems(lineItems.filter((_, i) => i !== index)); };
  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map((li, i) => i === index ? { ...li, [field]: value } : li));
  };

  // When product selected, fill in description and rate
  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setLineItems(lineItems.map((li, i) => i === index ? {
        ...li,
        productId,
        description: product.name || product.description || li.description,
        rate: product.sellingPrice || product.price || li.rate,
        taxRate: product.taxRate || li.taxRate,
      } : li));
    }
  };

  // Set due date based on payment terms
  const handlePaymentTermsChange = (terms: string) => {
    setFormData(prev => ({ ...prev, paymentTerms: terms }));
    const days: Record<string, number> = { due_on_receipt: 0, net_7: 7, net_15: 15, net_30: 30, net_45: 45, net_60: 60, net_90: 90 };
    if (days[terms] !== undefined) {
      const due = new Date(formData.invoiceDate);
      due.setDate(due.getDate() + days[terms]);
      setFormData(prev => ({ ...prev, dueDate: due.toISOString().split("T")[0] }));
    }
  };

  const handleSubmit = async (status: "draft" | "sent") => {
    if (!formData.customerId && lineItems.every(li => !li.description)) {
      toast.error("Please add at least one line item with a description");
      return;
    }
    if (!formData.dueDate) {
      toast.error("Please set a due date");
      return;
    }

    setSubmitting(status === "sent" ? "send" : "draft");
    try {
      const payload = {
        customerId: formData.customerId || undefined,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        lineItems: lineItems.filter(li => li.description).map(li => ({
          description: li.description,
          quantity: li.quantity,
          rate: li.rate,
          amount: li.quantity * li.rate,
          taxRate: li.taxRate,
          taxAmount: li.quantity * li.rate * li.taxRate / 100,
          productId: li.productId,
        })),
        notes: formData.notes,
        terms: formData.terms,
        revenueAccountId: formData.revenueAccountId || undefined,
        receivableAccountId: formData.receivableAccountId || undefined,
        taxAccountId: formData.taxAccountId || undefined,
        status,
      };

      if (isEdit) {
        await api.put(`/invoices/${initialData.id}`, payload);
        toast.success("Invoice updated");
      } else {
        await api.post("/invoices", payload);
        toast.success(status === "sent" ? "Invoice created and sent" : "Invoice saved as draft");
      }
      onBack();
    } catch (err: any) {
      toast.error(err.message || "Failed to save invoice");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div><h1 className="text-2xl font-bold">{isEdit ? "Edit Invoice" : "New Invoice"}</h1><p className="text-sm text-muted-foreground">Create a professional invoice for your customer</p></div>
      </div>
      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Form (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Dates */}
          <Card>
            <CardHeader><CardTitle>Invoice Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <select value={formData.customerId} onChange={e => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
                    <option value="">Walk-in Customer</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <select value={formData.paymentTerms} onChange={e => handlePaymentTermsChange(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
                    {paymentTermsOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Invoice Date</Label>
                  <Input type="date" value={formData.invoiceDate} onChange={e => setFormData(prev => ({ ...prev, invoiceDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={formData.dueDate} onChange={e => setFormData(prev => ({ ...prev, dueDate: e.target.value }))} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {lineItems.map((li, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-3">
                  {/* Product select */}
                  <div className="col-span-12 sm:col-span-3 space-y-1">
                    <Label className="text-xs">Product (optional)</Label>
                    <select value={li.productId || ""} onChange={e => handleProductSelect(index, e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:border-ring">
                      <option value="">Select product...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.sellingPrice || p.price || 0)})</option>)}
                    </select>
                  </div>
                  {/* Description */}
                  <div className="col-span-12 sm:col-span-3 space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input value={li.description} onChange={e => updateLineItem(index, "description", e.target.value)} placeholder="Item description" className="h-9" />
                  </div>
                  {/* Qty */}
                  <div className="col-span-4 sm:col-span-2 space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" min={0.01} step={0.01} value={li.quantity} onChange={e => updateLineItem(index, "quantity", parseFloat(e.target.value) || 0)} className="h-9" />
                  </div>
                  {/* Rate */}
                  <div className="col-span-4 sm:col-span-2 space-y-1">
                    <Label className="text-xs">Rate</Label>
                    <Input type="number" min={0} step={0.01} value={li.rate} onChange={e => updateLineItem(index, "rate", parseFloat(e.target.value) || 0)} className="h-9" />
                  </div>
                  {/* Tax */}
                  <div className="col-span-3 sm:col-span-1 space-y-1">
                    <Label className="text-xs">Tax %</Label>
                    <Input type="number" min={0} max={100} value={li.taxRate} onChange={e => updateLineItem(index, "taxRate", parseFloat(e.target.value) || 0)} className="h-9" />
                  </div>
                  {/* Remove */}
                  <div className="col-span-1 flex justify-center">
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-red-500" onClick={() => removeLineItem(index)} disabled={lineItems.length <= 1}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Discount */}
          <Card>
            <CardHeader><CardTitle>Discount</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Discount Type</Label>
                  <select value={formData.discountType} onChange={e => setFormData(prev => ({ ...prev, discountType: e.target.value as any }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (GHS)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Discount Value</Label>
                  <Input type="number" min={0} step={0.01} value={formData.discount} onChange={e => setFormData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Discount Amount</Label>
                  <div className="h-9 flex items-center px-3 rounded-md border bg-muted text-sm font-medium">{formatCurrency(discountAmount)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Accounting */}
          <Card>
            <CardHeader><CardTitle>Accounting</CardTitle><CardDescription>Choose which accounts this invoice posts to (optional — defaults will be used if left empty)</CardDescription></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Revenue Account</Label>
                  <select value={formData.revenueAccountId} onChange={e => setFormData(prev => ({ ...prev, revenueAccountId: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
                    <option value="">Default (Sales Revenue)</option>
                    {accounts.filter(a => a.accountType === "revenue").map(a => <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Receivable Account</Label>
                  <select value={formData.receivableAccountId} onChange={e => setFormData(prev => ({ ...prev, receivableAccountId: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
                    <option value="">Default (Accounts Receivable)</option>
                    {accounts.filter(a => a.accountType === "asset").map(a => <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Tax Account</Label>
                  <select value={formData.taxAccountId} onChange={e => setFormData(prev => ({ ...prev, taxAccountId: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
                    <option value="">Default (VAT Payable)</option>
                    {accounts.filter(a => a.accountType === "liability").map(a => <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>)}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes & Terms */}
          <Card>
            <CardHeader><CardTitle>Notes & Terms</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Customer Notes</Label>
                <Textarea value={formData.notes} onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Notes visible to customer on the invoice..." rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Payment Terms & Conditions</Label>
                <Textarea value={formData.terms} onChange={e => setFormData(prev => ({ ...prev, terms: e.target.value }))} placeholder="Payment terms, late fees policy, etc..." rows={3} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right - Summary Sidebar (1/3) */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <Card>
              <CardHeader><CardTitle>Invoice Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
                {taxTotal > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax</span><span className="font-medium">{formatCurrency(taxTotal)}</span></div>}
                {discountAmount > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Discount</span><span className="font-medium text-red-600">-{formatCurrency(discountAmount)}</span></div>}
                <Separator />
                <div className="flex justify-between"><span className="font-semibold">Total</span><span className="text-xl font-bold">{formatCurrency(totalAmount)}</span></div>
                <div className="text-xs text-muted-foreground">{lineItems.filter(li => li.description).length} line item{lineItems.filter(li => li.description).length !== 1 ? "s" : ""}</div>

                <Separator />

                <div className="space-y-2">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={!!submitting} onClick={() => handleSubmit("draft")}>
                    {submitting === "draft" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save as Draft
                  </Button>
                  <Button className="w-full" disabled={!!submitting} onClick={() => handleSubmit("sent")}>
                    {submitting === "send" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    Save & Send
                  </Button>
                  <Button variant="outline" className="w-full" onClick={onBack} disabled={!!submitting}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
