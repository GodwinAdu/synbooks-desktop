/**
 * Vendor Create Form - Full page form (2-column grid like customer form)
 * Fields: Basic Info, Address, Payment Details, Notes
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

const mobileMoneyProviders = [
  { value: "mtn", label: "MTN Mobile Money" },
  { value: "vodafone", label: "Vodafone Cash" },
  { value: "airteltigo", label: "AirtelTigo Money" },
];

export function VendorCreateForm({ onBack }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    // Basic Info
    name: "",
    email: "",
    phone: "",
    company: "",
    taxId: "",
    // Address
    street: "",
    city: "",
    state: "",
    country: "Ghana",
    // Payment Details
    paymentTerms: "net_30",
    bankName: "",
    accountNumber: "",
    accountName: "",
    mobileMoneyProvider: "",
    mobileMoneyNumber: "",
    // Notes
    notes: "",
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Vendor name is required");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/vendors", {
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        company: formData.company || undefined,
        taxId: formData.taxId || undefined,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          country: formData.country,
        },
        paymentTerms: formData.paymentTerms,
        bankDetails: {
          bankName: formData.bankName || undefined,
          accountNumber: formData.accountNumber || undefined,
          accountName: formData.accountName || undefined,
        },
        mobileMoneyProvider: formData.mobileMoneyProvider || undefined,
        mobileMoneyNumber: formData.mobileMoneyNumber || undefined,
        notes: formData.notes || undefined,
      });
      toast.success("Vendor created successfully");
      onBack();
    } catch (err: any) {
      toast.error(err.message || "Failed to create vendor");
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
          <h1 className="text-2xl font-bold">New Vendor</h1>
          <p className="text-sm text-muted-foreground">Add a new vendor to your records</p>
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
              <Label>Name *</Label>
              <Input value={formData.name} onChange={e => updateField("name", e.target.value)} placeholder="Vendor name" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={e => updateField("email", e.target.value)} placeholder="vendor@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={formData.phone} onChange={e => updateField("phone", e.target.value)} placeholder="+233..." />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input value={formData.company} onChange={e => updateField("company", e.target.value)} placeholder="Company name" />
            </div>
            <div className="space-y-2">
              <Label>Tax ID (TIN)</Label>
              <Input value={formData.taxId} onChange={e => updateField("taxId", e.target.value)} placeholder="Tax Identification Number" />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Street</Label>
              <Input value={formData.street} onChange={e => updateField("street", e.target.value)} placeholder="Street address" />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
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
            <div className="space-y-2">
              <Label>Country</Label>
              <Input value={formData.country} onChange={e => updateField("country", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <div className="space-y-2">
              <Label>Bank Name</Label>
              <Input value={formData.bankName} onChange={e => updateField("bankName", e.target.value)} placeholder="e.g. GCB Bank" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input value={formData.accountNumber} onChange={e => updateField("accountNumber", e.target.value)} placeholder="Bank account #" />
              </div>
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input value={formData.accountName} onChange={e => updateField("accountName", e.target.value)} placeholder="Account holder name" />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Mobile Money Provider</Label>
              <select
                value={formData.mobileMoneyProvider}
                onChange={e => updateField("mobileMoneyProvider", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              >
                <option value="">Select provider...</option>
                {mobileMoneyProviders.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Mobile Money Number</Label>
              <Input value={formData.mobileMoneyNumber} onChange={e => updateField("mobileMoneyNumber", e.target.value)} placeholder="0XX XXX XXXX" />
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
                placeholder="Internal notes about this vendor..."
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
          Save Vendor
        </Button>
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
