/**
 * Tax Settings Tab
 * Ghana-specific tax configuration (VAT, NHIL, GETFund, PAYE).
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export function TaxTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vatEnabled: true,
    vatRate: 15,
    nhilEnabled: true,
    nhilRate: 2.5,
    getfundEnabled: true,
    getfundRate: 2.5,
    covidLevyEnabled: true,
    covidLevyRate: 1,
    withholdingEnabled: false,
    withholdingRate: 5,
    tin: "",
    vatRegistered: true,
    ssnitEmployeeRate: 5.5,
    ssnitEmployerRate: 13,
    tier2Rate: 5,
  });

  useEffect(() => {
    api.get("/settings/organization")
      .then((org: any) => {
        const t = org?.taxSettings || org?.settings?.taxSettings || {};
        setForm((prev) => ({ ...prev, ...t, tin: org?.taxId || t.tin || "" }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/settings/organization", { taxSettings: form });
      toast.success("Tax settings saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  const totalVAT = (form.vatEnabled ? form.vatRate : 0) +
    (form.nhilEnabled ? form.nhilRate : 0) +
    (form.getfundEnabled ? form.getfundRate : 0) +
    (form.covidLevyEnabled ? form.covidLevyRate : 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Sales Tax (VAT/Levies)</CardTitle>
          <CardDescription>Configure Ghana Revenue Authority tax rates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-3 bg-muted/30">
            <p className="text-sm font-medium">Effective Combined Rate: <span className="text-primary font-bold">{totalVAT}%</span></p>
          </div>

          <TaxRow label="VAT (Standard)" rate={form.vatRate} enabled={form.vatEnabled}
            onToggle={(v) => setForm({ ...form, vatEnabled: v })}
            onRateChange={(v) => setForm({ ...form, vatRate: v })} />
          <TaxRow label="NHIL (National Health Insurance Levy)" rate={form.nhilRate} enabled={form.nhilEnabled}
            onToggle={(v) => setForm({ ...form, nhilEnabled: v })}
            onRateChange={(v) => setForm({ ...form, nhilRate: v })} />
          <TaxRow label="GETFund Levy" rate={form.getfundRate} enabled={form.getfundEnabled}
            onToggle={(v) => setForm({ ...form, getfundEnabled: v })}
            onRateChange={(v) => setForm({ ...form, getfundRate: v })} />
          <TaxRow label="COVID-19 Health Recovery Levy" rate={form.covidLevyRate} enabled={form.covidLevyEnabled}
            onToggle={(v) => setForm({ ...form, covidLevyEnabled: v })}
            onRateChange={(v) => setForm({ ...form, covidLevyRate: v })} />
          <TaxRow label="Withholding Tax" rate={form.withholdingRate} enabled={form.withholdingEnabled}
            onToggle={(v) => setForm({ ...form, withholdingEnabled: v })}
            onRateChange={(v) => setForm({ ...form, withholdingRate: v })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payroll Taxes (SSNIT/Tier 2)</CardTitle>
          <CardDescription>Social security and pension contribution rates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>SSNIT Employee (%)</Label>
              <Input type="number" step="0.1" value={form.ssnitEmployeeRate}
                onChange={(e) => setForm({ ...form, ssnitEmployeeRate: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>SSNIT Employer (%)</Label>
              <Input type="number" step="0.1" value={form.ssnitEmployerRate}
                onChange={(e) => setForm({ ...form, ssnitEmployerRate: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Tier 2 (%)</Label>
              <Input type="number" step="0.1" value={form.tier2Rate}
                onChange={(e) => setForm({ ...form, tier2Rate: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tax Registration</CardTitle>
          <CardDescription>Your GRA tax identifiers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>TIN (Tax Identification Number)</Label>
              <Input value={form.tin} onChange={(e) => setForm({ ...form, tin: e.target.value })} placeholder="e.g., P0012345678" />
            </div>
            <div className="space-y-2 flex items-end gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={form.vatRegistered} onCheckedChange={(v) => setForm({ ...form, vatRegistered: v })} />
                <Label>VAT Registered</Label>
              </div>
            </div>
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

function TaxRow({ label, rate, enabled, onToggle, onRateChange }: {
  label: string; rate: number; enabled: boolean;
  onToggle: (v: boolean) => void; onRateChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex items-center gap-3">
        <Switch checked={enabled} onCheckedChange={onToggle} />
        <span className={`text-sm ${enabled ? "" : "text-muted-foreground line-through"}`}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="0.1"
          className="w-20 h-8 text-sm text-right"
          value={rate}
          onChange={(e) => onRateChange(parseFloat(e.target.value) || 0)}
          disabled={!enabled}
        />
        <span className="text-sm text-muted-foreground">%</span>
      </div>
    </div>
  );
}
