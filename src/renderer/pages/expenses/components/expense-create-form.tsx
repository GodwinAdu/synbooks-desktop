/**
 * Expense Create Form - Full page form
 * Fields: Expense Details, Amount & Tax, Category & Accounts, Additional
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
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

interface Props {
  onBack: () => void;
}

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
];

export function ExpenseCreateForm({ onBack }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    vendorId: "",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "cash",
    referenceNumber: "",
    // Amount & Tax
    amount: 0,
    taxRate: 0,
    isTaxable: false,
    // Category & Accounts
    category: "",
    description: "",
    expenseAccountId: "",
    paymentAccountId: "",
    // Additional
    isReimbursable: false,
    project: "",
    notes: "",
  });

  const taxAmount = formData.isTaxable ? (formData.amount * formData.taxRate) / 100 : 0;

  useEffect(() => {
    api.get("/vendors", { pageSize: 500 }).then((res: any) => setVendors(res.data || [])).catch(() => {});
    api.get("/accounts", { pageSize: 500 }).then((res: any) => setAccounts(Array.isArray(res) ? res : res.data || [])).catch(() => {});
  }, []);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.amount || formData.amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/expenses", {
        vendorId: formData.vendorId || undefined,
        date: formData.date,
        paymentMethod: formData.paymentMethod,
        referenceNumber: formData.referenceNumber || undefined,
        amount: formData.amount,
        taxRate: formData.isTaxable ? formData.taxRate : 0,
        taxAmount: taxAmount,
        isTaxable: formData.isTaxable,
        category: formData.category || undefined,
        description: formData.description || undefined,
        expenseAccountId: formData.expenseAccountId || undefined,
        paymentAccountId: formData.paymentAccountId || undefined,
        isReimbursable: formData.isReimbursable,
        project: formData.project || undefined,
        notes: formData.notes || undefined,
      });
      toast.success("Expense saved successfully");
      onBack();
    } catch (err: any) {
      toast.error(err.message || "Failed to save expense");
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
          <h1 className="text-2xl font-bold">New Expense</h1>
          <p className="text-sm text-muted-foreground">Record a business expense</p>
        </div>
      </div>
      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        {/* Expense Details */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <select
                value={formData.vendorId}
                onChange={e => updateField("vendorId", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                <option value="">Select vendor (optional)</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={formData.date} onChange={e => updateField("date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <select
                value={formData.paymentMethod}
                onChange={e => updateField("paymentMethod", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                {paymentMethods.map(pm => (
                  <option key={pm.value} value={pm.value}>{pm.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input value={formData.referenceNumber} onChange={e => updateField("referenceNumber", e.target.value)} placeholder="Receipt or reference #" />
            </div>
          </CardContent>
        </Card>

        {/* Amount & Tax */}
        <Card>
          <CardHeader>
            <CardTitle>Amount & Tax</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (GHS) *</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={formData.amount || ""}
                onChange={e => updateField("amount", parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Is Taxable</Label>
              <Switch
                checked={formData.isTaxable}
                onCheckedChange={v => updateField("isTaxable", v)}
              />
            </div>
            {formData.isTaxable && (
              <>
                <div className="space-y-2">
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    value={formData.taxRate || ""}
                    onChange={e => updateField("taxRate", parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 12.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax Amount</Label>
                  <div className="h-9 flex items-center px-3 rounded-md border bg-muted text-sm font-medium">
                    {formatCurrency(taxAmount)}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Category & Accounts */}
        <Card>
          <CardHeader>
            <CardTitle>Category & Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={formData.category} onChange={e => updateField("category", e.target.value)} placeholder="e.g. Office Supplies, Travel" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={formData.description} onChange={e => updateField("description", e.target.value)} placeholder="Brief description of expense" />
            </div>
            <div className="space-y-2">
              <Label>Expense Account</Label>
              <select
                value={formData.expenseAccountId}
                onChange={e => updateField("expenseAccountId", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                <option value="">Select expense account</option>
                {accounts.filter(a => a.accountType === "expense").map(a => (
                  <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Payment Account</Label>
              <select
                value={formData.paymentAccountId}
                onChange={e => updateField("paymentAccountId", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                <option value="">Select payment account</option>
                {accounts.filter(a => a.accountType === "asset").map(a => (
                  <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Additional */}
        <Card>
          <CardHeader>
            <CardTitle>Additional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Is Reimbursable</Label>
              <Switch
                checked={formData.isReimbursable}
                onCheckedChange={v => updateField("isReimbursable", v)}
              />
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <Input value={formData.project} onChange={e => updateField("project", e.target.value)} placeholder="Project name (optional)" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={e => updateField("notes", e.target.value)}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 max-w-5xl">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Expense
        </Button>
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
