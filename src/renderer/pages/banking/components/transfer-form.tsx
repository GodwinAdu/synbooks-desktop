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

export function TransferForm({ accounts, onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fromAccountId: "",
    toAccountId: "",
    amount: 0,
    transactionDate: new Date().toISOString().split("T")[0],
    description: "Bank Transfer",
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
    if (!form.fromAccountId || !form.toAccountId) {
      toast.error("Please select both accounts");
      return;
    }
    if (form.fromAccountId === form.toAccountId) {
      toast.error("Source and destination accounts must be different");
      return;
    }
    if (!form.amount || form.amount <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }
    setLoading(true);
    try {
      // Create withdrawal from source account
      await api.post("/banking/transactions", {
        bankAccountId: form.fromAccountId,
        transactionDate: form.transactionDate,
        transactionType: "withdrawal",
        amount: form.amount,
        description: `Transfer to ${accounts.find(a => a.id === form.toAccountId)?.accountName || "account"}: ${form.description}`,
        referenceNumber: form.referenceNumber || undefined,
      });
      // Create deposit to destination account
      await api.post("/banking/transactions", {
        bankAccountId: form.toAccountId,
        transactionDate: form.transactionDate,
        transactionType: "deposit",
        amount: form.amount,
        description: `Transfer from ${accounts.find(a => a.id === form.fromAccountId)?.accountName || "account"}: ${form.description}`,
        referenceNumber: form.referenceNumber || undefined,
      });
      toast.success("Transfer completed successfully");
      onBack();
    } catch (err: any) {
      toast.error(err.message || "Failed to complete transfer");
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
          title="Bank Transfer"
          description="Transfer funds between your bank accounts"
        />
      </div>
      <Separator />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Transfer Details</CardTitle>
          <CardDescription>
            Move money between your connected bank accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fromAccountId">From Account *</Label>
                <select
                  id="fromAccountId"
                  name="fromAccountId"
                  value={form.fromAccountId}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="">Select source account...</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} ({acc.bankName})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="toAccountId">To Account *</Label>
                <select
                  id="toAccountId"
                  name="toAccountId"
                  value={form.toAccountId}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="">Select destination account...</option>
                  {accounts
                    .filter((acc) => acc.id !== form.fromAccountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} ({acc.bankName})
                      </option>
                    ))}
                </select>
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
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Bank Transfer"
                  value={form.description}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="referenceNumber">Reference Number</Label>
                <Input
                  id="referenceNumber"
                  name="referenceNumber"
                  placeholder="Optional reference"
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
                {loading ? "Transferring..." : "Complete Transfer"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
