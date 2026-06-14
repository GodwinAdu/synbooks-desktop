import { useState } from "react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Heading } from "@/components/commons/heading";

interface Props {
  onBack: () => void;
}

export function BankAccountCreate({ onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    accountName: "",
    bankName: "",
    accountNumber: "",
    accountType: "checking",
    currency: "GHS",
    currentBalance: 0,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "currentBalance" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.accountName.trim() || !form.bankName.trim()) {
      toast.error("Account name and bank name are required");
      return;
    }
    setLoading(true);
    try {
      await api.post("/banking/accounts", form);
      toast.success("Bank account created successfully");
      onBack();
    } catch (err: any) {
      toast.error(err.message || "Failed to create bank account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Heading
          title="Add Bank Account"
          description="Set up a new bank account for tracking"
        />
      </div>
      <Separator />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>
            Enter the details of your bank account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountName">Account Name *</Label>
                <Input
                  id="accountName"
                  name="accountName"
                  placeholder="e.g. Business Checking"
                  value={form.accountName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name *</Label>
                <Input
                  id="bankName"
                  name="bankName"
                  placeholder="e.g. GCB Bank"
                  value={form.bankName}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  name="accountNumber"
                  placeholder="e.g. 1234567890"
                  value={form.accountNumber}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountType">Account Type</Label>
                <select
                  id="accountType"
                  name="accountType"
                  value={form.accountType}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="money_market">Money Market</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentBalance">Opening Balance</Label>
                <Input
                  id="currentBalance"
                  name="currentBalance"
                  type="number"
                  step="0.01"
                  value={form.currentBalance}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onBack}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
