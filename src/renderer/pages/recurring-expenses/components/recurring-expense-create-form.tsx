/**
 * Recurring Expense Create Form - Full page form
 * Fields: Name, Vendor, Amount, Category, Frequency, Start/End Date, Notes
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

interface Props {
  onBack: () => void;
}

const frequencyOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

export function RecurringExpenseCreateForm({ onBack }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [vendors, setVendors] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    vendorId: "",
    amount: "",
    category: "",
    frequency: "monthly",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    notes: "",
  });

  useEffect(() => {
    api.get("/vendors", { pageSize: 500 }).then((res: any) => setVendors(res.data || [])).catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a name");
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    try {
      const vendor = vendors.find(v => v.id === formData.vendorId);
      await api.post("/recurring-expenses", {
        name: formData.name,
        vendorId: formData.vendorId || undefined,
        vendorName: vendor?.name || "",
        amount: parseFloat(formData.amount),
        category: formData.category || undefined,
        frequency: formData.frequency,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        nextRunDate: formData.startDate,
        notes: formData.notes || undefined,
        isActive: 1,
      });
      toast.success("Recurring expense created");
      onBack();
    } catch (err: any) {
      toast.error(err.message || "Failed to save recurring expense");
    } finally {
      setSubmitting(false);
    }
  };

  const frequencyLabel = frequencyOptions.find(f => f.value === formData.frequency)?.label || formData.frequency;
  const amount = parseFloat(formData.amount) || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Recurring Expense</h1>
          <p className="text-sm text-muted-foreground">Set up automatic expense generation</p>
        </div>
      </div>
      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Form (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Expense Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Office Rent, Internet Bill"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vendor (optional)</Label>
                  <select
                    value={formData.vendorId}
                    onChange={e => setFormData(prev => ({ ...prev, vendorId: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    <option value="">Select vendor...</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={formData.amount}
                    onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category (optional)</Label>
                  <Input
                    value={formData.category}
                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="e.g., Rent, Utilities, Subscriptions"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <select
                    value={formData.frequency}
                    onChange={e => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  >
                    {frequencyOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div></div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" value={formData.startDate} onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>End Date (optional)</Label>
                  <Input type="date" value={formData.endDate} onChange={e => setFormData(prev => ({ ...prev, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional details..."
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
              <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium">{formatCurrency(amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frequency</span>
                  <span className="font-medium">{frequencyLabel}</span>
                </div>
                {formData.category && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium">{formData.category}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold">Per Occurrence</span>
                  <span className="text-xl font-bold">{formatCurrency(amount)}</span>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    disabled={submitting}
                    onClick={handleSubmit}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Recurring Expense
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
