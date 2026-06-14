/**
 * Payroll Settings Tab
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export function PayrollTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    payFrequency: "monthly",
    payDay: "28",
    overtimeRate: 1.5,
    workingHoursPerDay: 8,
    workingDaysPerWeek: 5,
    payslipPrefix: "PAY-",
  });

  useEffect(() => {
    api.get("/settings/organization")
      .then((org: any) => {
        const s = org?.settings || {};
        setForm((prev) => ({
          ...prev,
          payFrequency: s.payFrequency || "monthly",
          payDay: s.payDay || "28",
          overtimeRate: s.overtimeRate || 1.5,
          workingHoursPerDay: s.workingHoursPerDay || 8,
          workingDaysPerWeek: s.workingDaysPerWeek || 5,
          payslipPrefix: s.payslipPrefix || "PAY-",
        }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/settings/organization", { settings: form });
      toast.success("Payroll settings saved");
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
          <CardTitle>Pay Schedule</CardTitle>
          <CardDescription>Configure how often employees are paid</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pay Frequency</Label>
              <Select value={form.payFrequency} onValueChange={(v) => setForm({ ...form, payFrequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                  <SelectItem value="semi-monthly">Semi-Monthly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pay Day (of month)</Label>
              <Input type="number" min="1" max="31" value={form.payDay}
                onChange={(e) => setForm({ ...form, payDay: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Payslip Prefix</Label>
            <Input className="max-w-xs" value={form.payslipPrefix}
              onChange={(e) => setForm({ ...form, payslipPrefix: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Work Schedule</CardTitle>
          <CardDescription>Standard working hours configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Hours per Day</Label>
              <Input type="number" step="0.5" value={form.workingHoursPerDay}
                onChange={(e) => setForm({ ...form, workingHoursPerDay: parseFloat(e.target.value) || 8 })} />
            </div>
            <div className="space-y-2">
              <Label>Days per Week</Label>
              <Input type="number" min="1" max="7" value={form.workingDaysPerWeek}
                onChange={(e) => setForm({ ...form, workingDaysPerWeek: parseInt(e.target.value) || 5 })} />
            </div>
            <div className="space-y-2">
              <Label>Overtime Multiplier</Label>
              <Input type="number" step="0.25" value={form.overtimeRate}
                onChange={(e) => setForm({ ...form, overtimeRate: parseFloat(e.target.value) || 1.5 })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm">Ghana PAYE Tax Brackets (2024)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Chargeable Income (GHS)</th>
                  <th className="text-right py-2 font-medium">Rate</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b"><td className="py-1.5">First 490</td><td className="text-right">0%</td></tr>
                <tr className="border-b"><td className="py-1.5">Next 110</td><td className="text-right">5%</td></tr>
                <tr className="border-b"><td className="py-1.5">Next 130</td><td className="text-right">10%</td></tr>
                <tr className="border-b"><td className="py-1.5">Next 3,166.67</td><td className="text-right">17.5%</td></tr>
                <tr className="border-b"><td className="py-1.5">Next 16,000</td><td className="text-right">25%</td></tr>
                <tr className="border-b"><td className="py-1.5">Next 30,166.67</td><td className="text-right">30%</td></tr>
                <tr><td className="py-1.5">Exceeding 50,063.34</td><td className="text-right">35%</td></tr>
              </tbody>
            </table>
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
