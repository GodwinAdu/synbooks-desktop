/**
 * Employee Create Form
 * Full-page form with Ghana-specific fields: SSNIT, TIN, Mobile Money, etc.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Allowance {
  id: string;
  name: string;
  amount: number;
  taxable: boolean;
}

interface EmployeeFormData {
  // Personal
  firstName: string;
  lastName: string;
  employeeNumber: string;
  dateOfBirth: string;
  gender: string;
  // Employment
  department: string;
  position: string;
  employmentType: string;
  hireDate: string;
  status: string;
  // Compensation
  baseSalary: number;
  paymentFrequency: string;
  allowances: Allowance[];
  // Bank Details
  paymentMethod: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  momoProvider: string;
  momoNumber: string;
  momoName: string;
  // Tax Info
  tinNumber: string;
  ssnitNumber: string;
}

function generateEmployeeNumber(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `EMP-${num}`;
}

interface Props {
  onCancel: () => void;
  onSaved: () => void;
}

export function EmployeeCreateForm({ onCancel, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EmployeeFormData>({
    firstName: "",
    lastName: "",
    employeeNumber: generateEmployeeNumber(),
    dateOfBirth: "",
    gender: "",
    department: "",
    position: "",
    employmentType: "full-time",
    hireDate: new Date().toISOString().split("T")[0],
    status: "active",
    baseSalary: 0,
    paymentFrequency: "monthly",
    allowances: [],
    paymentMethod: "bank",
    bankName: "",
    accountNumber: "",
    accountName: "",
    momoProvider: "",
    momoNumber: "",
    momoName: "",
    tinNumber: "",
    ssnitNumber: "",
  });

  const updateField = (field: keyof EmployeeFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addAllowance = () => {
    const newAllowance: Allowance = {
      id: Date.now().toString(),
      name: "",
      amount: 0,
      taxable: true,
    };
    updateField("allowances", [...form.allowances, newAllowance]);
  };

  const updateAllowance = (id: string, field: keyof Allowance, value: any) => {
    updateField(
      "allowances",
      form.allowances.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const removeAllowance = (id: string) => {
    updateField(
      "allowances",
      form.allowances.filter((a) => a.id !== id)
    );
  };

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName) {
      toast.error("Employee name is required");
      return;
    }
    if (!form.department) {
      toast.error("Department is required");
      return;
    }
    if (!form.position) {
      toast.error("Position is required");
      return;
    }
    if (!form.hireDate) {
      toast.error("Hire date is required");
      return;
    }
    if (!form.baseSalary || form.baseSalary <= 0) {
      toast.error("Base salary is required");
      return;
    }

    setSaving(true);
    try {
      await api.post("/employees", {
        ...form,
        name: `${form.firstName} ${form.lastName}`,
      });
      toast.success("Employee created successfully");
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Failed to create employee");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add New Employee</h1>
          <p className="text-sm text-muted-foreground">
            Enter employee details below
          </p>
        </div>
      </div>

      <Separator />

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>First Name *</Label>
            <Input
              value={form.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              placeholder="John"
            />
          </div>
          <div className="space-y-2">
            <Label>Last Name *</Label>
            <Input
              value={form.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              placeholder="Mensah"
            />
          </div>
          <div className="space-y-2">
            <Label>Employee Number</Label>
            <Input
              value={form.employeeNumber}
              onChange={(e) => updateField("employeeNumber", e.target.value)}
              placeholder="EMP-XXXX"
            />
          </div>
          <div className="space-y-2">
            <Label>Date of Birth</Label>
            <Input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => updateField("dateOfBirth", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              value={form.gender}
              onValueChange={(v) => updateField("gender", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employment */}
      <Card>
        <CardHeader>
          <CardTitle>Employment Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Department *</Label>
            <Input
              value={form.department}
              onChange={(e) => updateField("department", e.target.value)}
              placeholder="e.g. Finance, Engineering"
            />
          </div>
          <div className="space-y-2">
            <Label>Position *</Label>
            <Input
              value={form.position}
              onChange={(e) => updateField("position", e.target.value)}
              placeholder="e.g. Senior Accountant"
            />
          </div>
          <div className="space-y-2">
            <Label>Employment Type</Label>
            <Select
              value={form.employmentType}
              onValueChange={(v) => updateField("employmentType", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full-time">Full-time</SelectItem>
                <SelectItem value="part-time">Part-time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="intern">Intern</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Hire Date *</Label>
            <Input
              type="date"
              value={form.hireDate}
              onChange={(e) => updateField("hireDate", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) => updateField("status", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Compensation */}
      <Card>
        <CardHeader>
          <CardTitle>Compensation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Base Salary (Monthly) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  GHS
                </span>
                <Input
                  type="number"
                  value={form.baseSalary || ""}
                  onChange={(e) =>
                    updateField("baseSalary", parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                  className="pl-12"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment Frequency</Label>
              <Select
                value={form.paymentFrequency}
                onValueChange={(v) => updateField("paymentFrequency", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Allowances */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Allowances</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAllowance}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Allowance
              </Button>
            </div>
            {form.allowances.map((allowance) => (
              <div
                key={allowance.id}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                <Input
                  value={allowance.name}
                  onChange={(e) =>
                    updateAllowance(allowance.id, "name", e.target.value)
                  }
                  placeholder="Allowance name"
                  className="flex-1"
                />
                <div className="relative w-32">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    GHS
                  </span>
                  <Input
                    type="number"
                    value={allowance.amount || ""}
                    onChange={(e) =>
                      updateAllowance(
                        allowance.id,
                        "amount",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="0.00"
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={allowance.taxable}
                    onCheckedChange={(v) =>
                      updateAllowance(allowance.id, "taxable", v)
                    }
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    Taxable
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-500"
                  onClick={() => removeAllowance(allowance.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {form.allowances.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No allowances added yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bank Details */}
      <Card>
        <CardHeader>
          <CardTitle>Bank / Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select
              value={form.paymentMethod}
              onValueChange={(v) => updateField("paymentMethod", v)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.paymentMethod === "bank" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input
                  value={form.bankName}
                  onChange={(e) => updateField("bankName", e.target.value)}
                  placeholder="e.g. GCB Bank"
                />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input
                  value={form.accountNumber}
                  onChange={(e) => updateField("accountNumber", e.target.value)}
                  placeholder="Account number"
                />
              </div>
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input
                  value={form.accountName}
                  onChange={(e) => updateField("accountName", e.target.value)}
                  placeholder="Account holder name"
                />
              </div>
            </div>
          )}

          {form.paymentMethod === "mobile_money" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>MoMo Provider</Label>
                <Select
                  value={form.momoProvider}
                  onValueChange={(v) => updateField("momoProvider", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MTN">MTN</SelectItem>
                    <SelectItem value="Vodafone">Vodafone</SelectItem>
                    <SelectItem value="AirtelTigo">AirtelTigo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>MoMo Number</Label>
                <Input
                  value={form.momoNumber}
                  onChange={(e) => updateField("momoNumber", e.target.value)}
                  placeholder="e.g. 024XXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label>MoMo Name</Label>
                <Input
                  value={form.momoName}
                  onChange={(e) => updateField("momoName", e.target.value)}
                  placeholder="Registered name"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tax Info */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>TIN Number</Label>
            <Input
              value={form.tinNumber}
              onChange={(e) => updateField("tinNumber", e.target.value)}
              placeholder="Tax Identification Number"
            />
          </div>
          <div className="space-y-2">
            <Label>SSNIT Number</Label>
            <Input
              value={form.ssnitNumber}
              onChange={(e) => updateField("ssnitNumber", e.target.value)}
              placeholder="SSNIT Number"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Employee"}
        </Button>
      </div>
    </div>
  );
}
