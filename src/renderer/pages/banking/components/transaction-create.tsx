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
import type { BankAccount } from "../types";

interface Props {
  accounts: BankAccount[];
  onBack: () => void;
}

export function TransactionCreate({ accounts, onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    bankAccountId: accounts[0]?.id || "",
    transactionType: "withdrawal" as string,
    transactionDate: new Date().toISOString().split("T")[0],
    amount: 0,
    description: "",
    payee: "",
    referenceNumber: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "amount" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bankAccountId) {
      toast.error("Please select a bank account");
      return;
    }
    if (!form.amount || form.amount <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Description is required");
      return;
    }
    setLoading(true);
    try {
      await api.post("/banking/transactions", form);
      toast.success("Transaction created successfully");
      onBack();
    } catch (err: any) {
      toast.error(err.message || "Failed to create transaction");
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
          title="New Transaction"
          description="Record a new bank transaction"
        />
      </div>
      <Separator />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
          <CardDescription>
            Enter the details of the bank transaction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankAccountId">Bank Account *</Label>
                <select
                  id="bankAccountId"
                  name="bankAccountId"
                  value={form.bankAccountId}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="">Select account...</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} ({acc.bankName})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transactionType">Transaction Type *</Label>
                <select
                  id="transactionType"
                  name="transactionType"
                  value={form.transactionType}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="deposit">Deposit</option>
                  <option value="withdrawal">Withdrawal</option>
                  <option value="fee">Fee</option>
                  <option value="interest">Interest</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transactionDate">Date *</Label>
                <Input
                  id="transactionDate"
                  name="transactionDate"
                  type="date"
                  value={form.transactionDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={form.amount || ""}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="e.g. Office supplies purchase"
                  value={form.description}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payee">Payee</Label>
                <Input
                  id="payee"
                  name="payee"
                  placeholder="e.g. Melcom Ltd"
                  value={form.payee}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="referenceNumber">Reference Number</Label>
                <Input
                  id="referenceNumber"
                  name="referenceNumber"
                  placeholder="e.g. CHQ-001234"
                  value={form.referenceNumber}
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
                {loading ? "Saving..." : "Save Transaction"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
