/**
 * Account Form - Full page form matching the Next.js version
 * Used for both creating and editing accounts.
 * Fields: Code (auto-generate), Name, Type, Sub Type, Parent Account,
 * Level, Opening Balance, Description, isParent/isActive/allowManualJournal toggles
 */

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Info, Wand2 } from "lucide-react";
import type { Account } from "../types";

const accountTypeOptions = [
  { value: "asset", label: "Asset" },
  { value: "liability", label: "Liability" },
  { value: "equity", label: "Equity" },
  { value: "revenue", label: "Revenue" },
  { value: "expense", label: "Expense" },
];

const subTypeOptions: Record<string, string[]> = {
  asset: [
    "Current Asset", "Cash & Cash Equivalents", "Bank", "Accounts Receivable",
    "Inventory", "Prepaid Expenses", "Other Current Assets", "Fixed Asset",
    "Property, Plant & Equipment", "Vehicles", "Furniture & Fixtures",
    "Accumulated Depreciation", "Intangible Assets", "Investments", "Other Assets",
  ],
  liability: [
    "Current Liability", "Accounts Payable", "Short-term Loan", "Credit Card",
    "Accrued Expenses", "Payroll Liabilities", "Sales Tax Payable",
    "Income Tax Payable", "Deferred Revenue", "Other Current Liabilities",
    "Long-term Liability", "Notes Payable", "Mortgage Payable", "Other Long-term Liabilities",
  ],
  equity: [
    "Owner's Equity", "Capital", "Retained Earnings", "Drawings/Dividends",
    "Common Stock", "Preferred Stock", "Treasury Stock", "Additional Paid-in Capital",
  ],
  revenue: [
    "Operating Revenue", "Sales Revenue", "Service Revenue", "Product Sales",
    "Consulting Revenue", "Subscription Revenue", "Other Income",
    "Interest Income", "Dividend Income", "Gain on Sale of Assets",
  ],
  expense: [
    "Cost of Goods Sold", "Operating Expense", "Salaries & Wages", "Employee Benefits",
    "Payroll Taxes", "Rent Expense", "Utilities", "Office Supplies", "Insurance",
    "Marketing & Advertising", "Professional Fees", "Legal Fees", "Accounting Fees",
    "Travel & Entertainment", "Meals & Entertainment", "Vehicle Expenses",
    "Repairs & Maintenance", "Depreciation", "Amortization", "Interest Expense",
    "Bank Charges", "Tax Expense", "Bad Debt Expense", "Other Expenses",
  ],
};

interface AccountFormProps {
  initialData?: Account;
  allAccounts: Account[];
  onBack: () => void;
  onSuccess: () => void;
}

export function AccountForm({ initialData, allAccounts, onBack, onSuccess }: AccountFormProps) {
  const isEditMode = !!initialData;

  const [formData, setFormData] = useState({
    accountCode: initialData?.accountCode || "",
    accountName: initialData?.accountName || "",
    accountType: initialData?.accountType || "asset",
    accountSubType: initialData?.accountSubType || "",
    parentAccountId: "",
    level: 0,
    isParent: false,
    description: "",
    openingBalance: initialData?.currentBalance || 0,
    openingBalanceDate: "",
    isActive: initialData?.isActive ?? true,
    allowManualJournal: true,
  });
  const [useCustomSubType, setUseCustomSubType] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Auto-fill sub type from parent
  useEffect(() => {
    if (formData.parentAccountId) {
      const parent = allAccounts.find(a => a.id === formData.parentAccountId);
      if (parent?.accountSubType) {
        updateField("accountSubType", parent.accountSubType);
      }
    }
  }, [formData.parentAccountId]);

  const generateAccountCode = () => {
    const typeRanges: Record<string, number> = { asset: 1000, liability: 2000, equity: 3000, revenue: 4000, expense: 5000 };
    const baseCode = typeRanges[formData.accountType] || 1000;
    const existingCodes = allAccounts
      .filter(a => a.accountType === formData.accountType)
      .map(a => parseInt(a.accountCode))
      .filter(n => !isNaN(n));

    if (existingCodes.length === 0) {
      updateField("accountCode", baseCode.toString());
    } else {
      const maxCode = Math.max(...existingCodes);
      updateField("accountCode", (maxCode + 10).toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountCode || !formData.accountName) {
      toast.error("Account code and name are required");
      return;
    }

    setSubmitting(true);
    try {
      if (isEditMode) {
        await api.put(`/accounts/${initialData.id}`, formData);
        toast.success("Account updated successfully");
      } else {
        await api.post("/accounts", { ...formData, currency: "GHS" });
        toast.success("Account created successfully");
      }
      onSuccess();
      onBack();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${isEditMode ? "update" : "create"} account`);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter parent accounts by same type
  const parentOptions = allAccounts.filter(a => a.accountType === formData.accountType && a.id !== initialData?.id);

  return (
    <div className="p-6 space-y-6">
      <Button type="button" variant="ghost" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Chart of Accounts
      </Button>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{isEditMode ? "Edit" : "Create"} Account</CardTitle>
            <CardDescription>
              {isEditMode ? "Update account information" : "Create accounts based on the 5 accounting elements: Assets, Liabilities, Equity, Revenue, Expenses"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Guide Alert */}
            <div className="flex items-start gap-3 rounded-lg border p-4 bg-muted/50">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                <strong>Quick Guide:</strong> Start with main categories (Level 0), then add sub-categories (Level 1), and finally detail accounts (Level 2+).
                Example: Assets → Current Assets → Cash
              </p>
            </div>

            {/* Code + Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Account Code *</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={generateAccountCode}>
                    <Wand2 className="h-3 w-3 mr-1" /> Generate
                  </Button>
                </div>
                <Input value={formData.accountCode} onChange={e => updateField("accountCode", e.target.value)} placeholder="e.g., 1110" className="font-mono" />
                <p className="text-xs text-muted-foreground">
                  <strong>Code Ranges:</strong> 1000-1999 (Assets), 2000-2999 (Liabilities), 3000-3999 (Equity), 4000-4999 (Revenue), 5000-5999 (Expenses)
                </p>
              </div>
              <div className="space-y-2">
                <Label>Account Name *</Label>
                <Input value={formData.accountName} onChange={e => updateField("accountName", e.target.value)} placeholder="e.g., Cash in Bank" />
                <p className="text-xs text-muted-foreground">Descriptive name for the account</p>
              </div>
            </div>

            {/* Type + Sub Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Type *</Label>
                <select value={formData.accountType}
                  onChange={e => { updateField("accountType", e.target.value); updateField("accountSubType", ""); }}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm capitalize outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
                  {accountTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Sub Type</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setUseCustomSubType(!useCustomSubType)}>
                    {useCustomSubType ? "Select from list" : "Type custom"}
                  </Button>
                </div>
                {useCustomSubType ? (
                  <Input value={formData.accountSubType} onChange={e => updateField("accountSubType", e.target.value)} placeholder="Enter custom sub type" />
                ) : (
                  <select value={formData.accountSubType} onChange={e => updateField("accountSubType", e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
                    <option value="">Select sub type...</option>
                    {(subTypeOptions[formData.accountType] || []).map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                )}
                <p className="text-xs text-muted-foreground">Auto-filled from parent or choose from list/type custom</p>
              </div>
            </div>

            {/* Parent Account */}
            <div className="space-y-2">
              <Label>Parent Account (Optional)</Label>
              <select value={formData.parentAccountId} onChange={e => updateField("parentAccountId", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]">
                <option value="">None - This will be a top-level account</option>
                {parentOptions.map(a => <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>)}
              </select>
              <p className="text-xs text-muted-foreground">
                <strong>Hierarchy:</strong> Leave empty for main category. Select a parent to create sub-accounts (e.g., Cash under Current Assets)
              </p>
            </div>

            {/* Level + Opening Balance */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Level</Label>
                <Input type="number" value={formData.level} onChange={e => updateField("level", parseInt(e.target.value) || 0)} min={0} max={5} />
                <p className="text-xs text-muted-foreground">
                  <strong>0</strong> = Main (Assets), <strong>1</strong> = Sub (Current Assets), <strong>2+</strong> = Detail (Cash)
                </p>
              </div>
              <div className="space-y-2">
                <Label>Opening Balance (GHS)</Label>
                <Input type="number" step="0.01" value={formData.openingBalance}
                  onChange={e => updateField("openingBalance", parseFloat(e.target.value) || 0)}
                  placeholder="0.00" disabled={isEditMode} />
                <p className="text-xs text-muted-foreground">
                  {isEditMode ? "Opening balance cannot be changed after creation" : "Starting balance — posts a GL entry automatically"}
                </p>
              </div>
            </div>

            {/* Opening Balance Date (create only) */}
            {!isEditMode && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Opening Balance Date</Label>
                  <Input type="date" value={formData.openingBalanceDate} onChange={e => updateField("openingBalanceDate", e.target.value)} />
                  <p className="text-xs text-muted-foreground">Date of the opening balance entry</p>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={e => updateField("description", e.target.value)} placeholder="Account description..." rows={3} />
            </div>

            {/* Toggle Switches */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-sm">Parent Account</Label>
                  <p className="text-xs text-muted-foreground">Enable if this will have sub-accounts</p>
                </div>
                <Switch checked={formData.isParent} onCheckedChange={v => updateField("isParent", v)} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-sm">Active</Label>
                  <p className="text-xs text-muted-foreground">Account can be used in transactions</p>
                </div>
                <Switch checked={formData.isActive} onCheckedChange={v => updateField("isActive", v)} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label className="text-sm">Manual Journal</Label>
                  <p className="text-xs text-muted-foreground">Allow manual journal entries</p>
                </div>
                <Switch checked={formData.allowManualJournal} onCheckedChange={v => updateField("allowManualJournal", v)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onBack} disabled={submitting}>Cancel</Button>
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
            <Save className="h-4 w-4 mr-2" />
            {submitting ? "Saving..." : isEditMode ? "Update Account" : "Save Account"}
          </Button>
        </div>
      </form>
    </div>
  );
}
