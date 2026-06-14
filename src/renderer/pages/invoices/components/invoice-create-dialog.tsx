/**
 * Invoice Create Dialog
 * Modal form for creating a new invoice.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  taxRate: number;
}

export function InvoiceCreateDialog({ open, onOpenChange, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerId: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    notes: "",
    terms: "",
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, rate: 0, taxRate: 0 },
  ]);

  if (!open) return null;

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, rate: 0, taxRate: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setLineItems(lineItems.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const taxTotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.rate * item.taxRate / 100), 0);
  const total = subtotal + taxTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        lineItems: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.quantity * item.rate,
          taxRate: item.taxRate,
          taxAmount: item.quantity * item.rate * item.taxRate / 100,
        })),
      };

      await api.post("/invoices", payload);
      toast.success("Invoice created successfully");
      onCreated();

      // Reset form
      setFormData({ customerId: "", invoiceDate: new Date().toISOString().split("T")[0], dueDate: "", notes: "", terms: "" });
      setLineItems([{ description: "", quantity: 1, rate: 0, taxRate: 0 }]);
    } catch (error: any) {
      toast.error(error.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />

      {/* Dialog */}
      <div className="relative bg-background rounded-lg border shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 m-4">
        <h2 className="text-lg font-semibold mb-1">Create Invoice</h2>
        <p className="text-sm text-muted-foreground mb-6">Add invoice details and line items below.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer ID</Label>
              <Input placeholder="Enter customer ID" value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Invoice Date</Label>
              <Input type="date" value={formData.invoiceDate}
                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} required />
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Line Items</Label>
              <Button type="button" variant="outline" size="xs" onClick={addLineItem}>
                <Plus className="size-3" /> Add Item
              </Button>
            </div>

            <div className="space-y-2">
              {lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-[1fr_80px_100px_80px_32px] gap-2 items-end">
                  <Input placeholder="Description" value={item.description}
                    onChange={(e) => updateLineItem(index, "description", e.target.value)} required />
                  <Input type="number" placeholder="Qty" min={1} value={item.quantity}
                    onChange={(e) => updateLineItem(index, "quantity", parseFloat(e.target.value) || 0)} />
                  <Input type="number" placeholder="Rate" min={0} step={0.01} value={item.rate}
                    onChange={(e) => updateLineItem(index, "rate", parseFloat(e.target.value) || 0)} />
                  <Input type="number" placeholder="Tax %" min={0} max={100} value={item.taxRate}
                    onChange={(e) => updateLineItem(index, "taxRate", parseFloat(e.target.value) || 0)} />
                  <Button type="button" variant="ghost" size="icon-xs" onClick={() => removeLineItem(index)} disabled={lineItems.length <= 1}>
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="flex flex-col items-end gap-1 pt-3 border-t text-sm">
              <div className="flex gap-8"><span className="text-muted-foreground">Subtotal:</span><span className="font-medium w-28 text-right">GHS {subtotal.toFixed(2)}</span></div>
              <div className="flex gap-8"><span className="text-muted-foreground">Tax:</span><span className="font-medium w-28 text-right">GHS {taxTotal.toFixed(2)}</span></div>
              <div className="flex gap-8 text-base"><span className="font-semibold">Total:</span><span className="font-bold w-28 text-right">GHS {total.toFixed(2)}</span></div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea placeholder="Add a note to the invoice..." value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Create Invoice
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
