/**
 * Invoice & Sales Settings Tab
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { PAYMENT_TERMS } from "../types";

export function InvoiceTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    invoicePrefix: "INV-",
    invoiceNextNumber: 1001,
    estimatePrefix: "EST-",
    creditNotePrefix: "CN-",
    salesOrderPrefix: "SO-",
    defaultPaymentTerms: "net30",
    invoiceNotes: "",
    invoiceTerms: "",
  });

  useEffect(() => {
    api.get("/settings/organization")
      .then((org: any) => {
        const s = org?.settings || {};
        setForm({
          invoicePrefix: s.invoicePrefix || "INV-",
          invoiceNextNumber: s.invoiceNextNumber || 1001,
          estimatePrefix: s.estimatePrefix || "EST-",
          creditNotePrefix: s.creditNotePrefix || "CN-",
          salesOrderPrefix: s.salesOrderPrefix || "SO-",
          defaultPaymentTerms: s.defaultPaymentTerms || "net30",
          invoiceNotes: s.invoiceNotes || "",
          invoiceTerms: s.invoiceTerms || "",
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/settings/organization", { settings: form });
      toast.success("Invoice settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Numbering</CardTitle>
          <CardDescription>Configure auto-numbering for invoices and other documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Invoice Prefix</Label>
              <Input value={form.invoicePrefix} onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Next Invoice Number</Label>
              <Input type="number" value={form.invoiceNextNumber} onChange={(e) => setForm({ ...form, invoiceNextNumber: parseInt(e.target.value) || 1 })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Estimate Prefix</Label>
              <Input value={form.estimatePrefix} onChange={(e) => setForm({ ...form, estimatePrefix: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Credit Note Prefix</Label>
              <Input value={form.creditNotePrefix} onChange={(e) => setForm({ ...form, creditNotePrefix: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Sales Order Prefix</Label>
              <Input value={form.salesOrderPrefix} onChange={(e) => setForm({ ...form, salesOrderPrefix: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Defaults</CardTitle>
          <CardDescription>Default values for new invoices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Payment Terms</Label>
            <Select value={form.defaultPaymentTerms} onValueChange={(v) => setForm({ ...form, defaultPaymentTerms: v })}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_TERMS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Default Invoice Notes</Label>
            <Textarea value={form.invoiceNotes} onChange={(e) => setForm({ ...form, invoiceNotes: e.target.value })} rows={3} placeholder="Notes that appear on every invoice..." />
          </div>
          <div className="space-y-2">
            <Label>Default Invoice Terms & Conditions</Label>
            <Textarea value={form.invoiceTerms} onChange={(e) => setForm({ ...form, invoiceTerms: e.target.value })} rows={3} placeholder="Terms that appear at the bottom of invoices..." />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
