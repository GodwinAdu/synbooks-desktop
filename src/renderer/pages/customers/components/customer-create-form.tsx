/**
 * Customer Create Form - Full page form
 * Fields: Basic Info, Billing Address, Financial Details, Notes
 */

import { useState } from "react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

interface Props {
  onBack: () => void;
}

const ghanaRegions = [
  "Greater Accra", "Ashanti", "Western", "Eastern", "Central",
  "Northern", "Volta", "Upper East", "Upper West", "Bono",
  "Bono East", "Ahafo", "Savannah", "North East", "Oti",
  "Western North",
];

const paymentTermsOptions = [
  { value: "due_on_receipt", label: "Due on Receipt" },
  { value: "net_7", label: "Net 7 Days" },
  { value: "net_15", label: "Net 15 Days" },
  { value: "net_30", label: "Net 30 Days" },
  { value: "net_45", label: "Net 45 Days" },
  { value: "net_60", label: "Net 60 Days" },
  { value: "net_90", label: "Net 90 Days" },
];

export function CustomerCreateForm({ onBack }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    customerType: "individual",
    name: "",
    companyName: "",
    email: "",
    phone: "",
    mobile: "",
    website: "",
    // Billing Address
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "Ghana",
    // Financial
    taxId: "",
    currency: "GHS",
    paymentTerms: "net_30",
    creditLimit: 0,
    openingBalance: 0,
    // Notes
    notes: "",
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!formData.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/customers", {
        customerType: formData.customerType,
        name: formData.name,
        companyName: formData.companyName || undefined,
        email: formData.email,
        phone: formData.phone,
        mobile: formData.mobile || undefined,
        website: formData.website || undefined,
        billingAddress: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country,
        },
        taxId: formData.taxId || undefined,
        currency: formData.currency,
        paymentTerms: formData.paymentTerms,
        creditLimit: formData.creditLimit || undefined,
        openingBalance: formData.openingBalance || undefined,
        notes: formData.notes || undefined,
      });
      toast.success("Customer created successfully");
      onBack();
    } catch (err: any) {
      toast.error(err.message || "Failed to create customer");
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
          <h1 className="text-2xl font-bold">New Customer</h1>
          <p className="text-sm text-muted-foreground">Add a new customer to your records</p>
        </div>
      </div>
      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Customer Type</Label>
              <select
                value={formData.customerType}
                onChange={e => updateField("customerType", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                <option value="individual">Individual</option>
                <option value="business">Business</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={formData.name} onChange={e => updateField("name", e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={formData.companyName} onChange={e => updateField("companyName", e.target.value)} placeholder="Company name (if applicable)" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={formData.email} onChange={e => updateField("email", e.target.value)} placeholder="customer@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input value={formData.phone} onChange={e => updateField("phone", e.target.value)} placeholder="+233..." />
              </div>
              <div className="space-y-2">
                <Label>Mobile</Label>
                <Input value={formData.mobile} onChange={e => updateField("mobile", e.target.value)} placeholder="+233..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input value={formData.website} onChange={e => updateField("website", e.target.value)} placeholder="https://..." />
            </div>
          </CardContent>
        </Card>

        {/* Billing Address */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Street *</Label>
              <Input value={formData.street} onChange={e => updateField("street", e.target.value)} placeholder="Street address" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City *</Label>
                <Input value={formData.city} onChange={e => updateField("city", e.target.value)} placeholder="City" />
              </div>
              <div className="space-y-2">
                <Label>State/Region</Label>
                <select
                  value={formData.state}
                  onChange={e => updateField("state", e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                >
                  <option value="">Select region...</option>
                  {ghanaRegions.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Zip Code</Label>
                <Input value={formData.zipCode} onChange={e => updateField("zipCode", e.target.value)} placeholder="Postal code" />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input value={formData.country} onChange={e => updateField("country", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Details */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tax ID (TIN)</Label>
                <Input value={formData.taxId} onChange={e => updateField("taxId", e.target.value)} placeholder="Tax Identification Number" />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input value={formData.currency} onChange={e => updateField("currency", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <select
                value={formData.paymentTerms}
                onChange={e => updateField("paymentTerms", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                {paymentTermsOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Credit Limit</Label>
                <Input type="number" min={0} step={0.01} value={formData.creditLimit} onChange={e => updateField("creditLimit", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-2">
                <Label>Opening Balance</Label>
                <Input type="number" min={0} step={0.01} value={formData.openingBalance} onChange={e => updateField("openingBalance", parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Internal Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={e => updateField("notes", e.target.value)}
                placeholder="Internal notes about this customer..."
                rows={4}
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
          Save Customer
        </Button>
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
