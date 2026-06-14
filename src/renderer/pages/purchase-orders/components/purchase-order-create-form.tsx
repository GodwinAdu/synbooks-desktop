/**
 * Purchase Order Create Form - Full page form with 2/3 + 1/3 sidebar
 * Fields: Vendor, Dates, Line Items (product, desc, qty, rate, tax%), Notes + Summary sidebar
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
  productId: string;
  description: string;
  quantity: number;
  rate: number;
  taxRate: number;
}

interface Props {
  onBack: () => void;
}

export function PurchaseOrderCreateForm({ onBack }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    vendorId: "",
    orderDate: new Date().toISOString().split("T")[0],
    expectedDate: "",
    notes: "",
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { productId: "", description: "", quantity: 1, rate: 0, taxRate: 0 },
  ]);

  useEffect(() => {
    api.get("/vendors", { pageSize: 500 }).then((res: any) => setVendors(res.data || [])).catch(() => {});
    api.get("/products", { pageSize: 500 }).then((res: any) => setProducts(res.data || [])).catch(() => {});
  }, []);

  // Calculations
  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.rate, 0);
  const taxTotal = lineItems.reduce((sum, li) => sum + (li.quantity * li.rate * li.taxRate / 100), 0);
  const totalAmount = subtotal + taxTotal;

  const addLineItem = () => setLineItems([...lineItems, { productId: "", description: "", quantity: 1, rate: 0, taxRate: 0 }]);
  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };
  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map((li, i) => i === index ? { ...li, [field]: value } : li));
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setLineItems(lineItems.map((li, i) => i === index ? {
        ...li,
        productId,
        description: product.name || product.description || li.description,
        rate: product.costPrice || product.price || li.rate,
        taxRate: product.taxRate || li.taxRate,
      } : li));
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.vendorId) {
      toast.error("Please select a vendor");
      return;
    }
    if (lineItems.every(li => !li.description)) {
      toast.error("Please add at least one line item");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/purchase-orders", {
        vendorId: formData.vendorId,
        orderDate: formData.orderDate,
        expectedDate: formData.expectedDate || undefined,
        lineItems: lineItems.filter(li => li.description).map(li => ({
          productId: li.productId || undefined,
          description: li.description,
          quantity: li.quantity,
          rate: li.rate,
          amount: li.quantity * li.rate,
          taxRate: li.taxRate,
          taxAmount: li.quantity * li.rate * li.taxRate / 100,
        })),
        notes: formData.notes || undefined,
        totalAmount,
      });
      toast.success("Purchase order saved successfully");
      onBack();
    } catch (err: any) {
      toast.error(err.message || "Failed to save purchase order");
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
          <h1 className="text-2xl font-bold">New Purchase Order</h1>
          <p className="text-sm text-muted-foreground">Create a purchase order for a vendor</p>
        </div>
      </div>
      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Form (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* PO Details */}
          <Card>
            <CardHeader><CardTitle>Order Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vendor *</Label>
                  <select
                    value={formData.vendorId}
                    onChange={e => updateField("vendorId", e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    <option value="">Select vendor...</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Order Date</Label>
                  <Input type="date" value={formData.orderDate} onChange={e => updateField("orderDate", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Expected Delivery Date</Label>
                  <Input type="date" value={formData.expectedDate} onChange={e => updateField("expectedDate", e.target.value)} />
                </div>
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
                  {/* Product select */}
                  <div className="col-span-12 sm:col-span-3 space-y-1">
                    <Label className="text-xs">Product</Label>
                    <select
                      value={li.productId}
                      onChange={e => handleProductSelect(index, e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:border-ring"
                    >
                      <option value="">Select product...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
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

          {/* Notes */}
          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={e => updateField("notes", e.target.value)}
                  placeholder="Special instructions or notes for this order..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right - Summary Sidebar (1/3) */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <Card>
              <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
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
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold">{formatCurrency(totalAmount)}</span>
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
                    Save PO
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
