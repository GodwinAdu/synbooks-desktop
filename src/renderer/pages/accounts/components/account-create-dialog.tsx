import { useState } from "react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Wand2, X } from "lucide-react";
import type { Account } from "../types";

const accountTypes = ["asset", "liability", "equity", "revenue", "expense"] as const;

const subTypeOptions: Record<string, string[]> = {
  asset: [
    "Cash",
    "Bank",
    "Accounts Receivable",
    "Inventory",
    "Fixed Asset",
    "Other Current Asset",
    "Other Non-Current Asset",
  ],
  liability: [
    "Accounts Payable",
    "Credit Card",
    "Current Liability",
    "Long-Term Liability",
    "Other Liability",
  ],
  equity: [
    "Owner's Equity",
    "Retained Earnings",
    "Opening Balance Equity",
    "Shareholder's Equity",
  ],
  revenue: [
    "Sales Revenue",
    "Service Revenue",
    "Interest Income",
    "Other Income",
  ],
  expense: [
    "Cost of Goods Sold",
    "Operating Expense",
    "Payroll Expense",
    "Rent Expense",
    "Utilities",
    "Other Expense",
  ],
};

const typeCodeRanges: Record<string, number> = {
  asset: 1000,
  liability: 2000,
  equity: 3000,
  revenue: 4000,
  expense: 5000,
};

interface AccountCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  onSuccess: () => void;
}

export function AccountCreateDialog({
  open,
  onOpenChange,
  accounts,
  onSuccess,
}: AccountCreateDialogProps) {
  const [formData, setFormData] = useState({
    accountCode: "",
    accountName: "",
    accountType: "asset" as string,
    accountSubType: "",
    openingBalance: 0,
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const generateCode = () => {
    const base = typeCodeRanges[formData.accountType] || 1000;
    const existingCodes = accounts
      .filter((a) => a.accountType === formData.accountType)
      .map((a) => parseInt(a.accountCode))
      .filter((n) => !isNaN(n));

    let nextCode = base + 1;
    if (existingCodes.length > 0) {
      nextCode = Math.max(...existingCodes) + 1;
    }
    setFormData((prev) => ({ ...prev, accountCode: String(nextCode) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.accountCode.trim() || !formData.accountName.trim()) {
      toast.error("Account code and name are required");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/accounts", {
        ...formData,
        currency: "GHS",
      });
      toast.success("Account created successfully");
      onSuccess();
      onOpenChange(false);
      setFormData({
        accountCode: "",
        accountName: "",
        accountType: "asset",
        accountSubType: "",
        openingBalance: 0,
        isActive: true,
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="relative z-50 w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Create Account</h2>
            <p className="text-sm text-muted-foreground">
              Add a new account to your chart of accounts
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Separator className="mb-4" />

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Code */}
          <div className="space-y-2">
            <Label htmlFor="create-accountCode">Account Code</Label>
            <div className="flex gap-2">
              <Input
                id="create-accountCode"
                value={formData.accountCode}
                onChange={(e) => updateField("accountCode", e.target.value)}
                placeholder="e.g. 1001"
                className="font-mono"
              />
              <Button
                type="button"
                variant="outline"
                onClick={generateCode}
                className="shrink-0"
              >
                <Wand2 className="h-4 w-4 mr-1" />
                Generate
              </Button>
            </div>
          </div>

          {/* Account Name */}
          <div className="space-y-2">
            <Label htmlFor="create-accountName">Account Name</Label>
            <Input
              id="create-accountName"
              value={formData.accountName}
              onChange={(e) => updateField("accountName", e.target.value)}
              placeholder="e.g. Cash in Bank"
            />
          </div>

          {/* Account Type */}
          <div className="space-y-2">
            <Label htmlFor="create-accountType">Account Type</Label>
            <select
              id="create-accountType"
              value={formData.accountType}
              onChange={(e) => {
                updateField("accountType", e.target.value);
                updateField("accountSubType", "");
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring capitalize"
            >
              {accountTypes.map((type) => (
                <option key={type} value={type} className="capitalize">
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Account Sub Type */}
          <div className="space-y-2">
            <Label htmlFor="create-accountSubType">Account Sub Type</Label>
            <select
              id="create-accountSubType"
              value={formData.accountSubType}
              onChange={(e) => updateField("accountSubType", e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select sub type...</option>
              {(subTypeOptions[formData.accountType] || []).map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>

          {/* Opening Balance */}
          <div className="space-y-2">
            <Label htmlFor="create-openingBalance">Opening Balance (GHS)</Label>
            <Input
              id="create-openingBalance"
              type="number"
              step="0.01"
              value={formData.openingBalance}
              onChange={(e) =>
                updateField("openingBalance", parseFloat(e.target.value) || 0)
              }
            />
          </div>

          {/* Is Active */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Active</Label>
              <p className="text-xs text-muted-foreground">
                Inactive accounts cannot be used in transactions
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={formData.isActive}
              onClick={() => updateField("isActive", !formData.isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.isActive
                  ? "bg-emerald-600"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.isActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting ? "Creating..." : "Create Account"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
