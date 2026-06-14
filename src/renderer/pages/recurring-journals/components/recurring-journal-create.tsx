import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Trash2, Check, AlertCircle } from "lucide-react";
import type { Account } from "../../accounts/types";
import type { RecurringJournal } from "../types";

interface LineItem {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
}

interface RecurringJournalCreateProps {
  onBack: () => void;
  onSave: (journal: RecurringJournal) => void;
}

export function RecurringJournalCreate({ onBack, onSave }: RecurringJournalCreateProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<RecurringJournal["frequency"]>("monthly");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { accountId: "", accountName: "", debit: 0, credit: 0 },
    { accountId: "", accountName: "", debit: 0, credit: 0 },
  ]);

  useEffect(() => {
    api
      .get("/accounts", { pageSize: 200 })
      .then((res: any) => setAccounts(res.data || []))
      .catch(console.error);
  }, []);

  const totalDebits = lineItems.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredits = lineItems.reduce((sum, line) => sum + (line.credit || 0), 0);
  const difference = Math.abs(totalDebits - totalCredits);
  const isBalanced = totalDebits > 0 && totalCredits > 0 && difference < 0.01;

  const addLine = () => {
    setLineItems((prev) => [...prev, { accountId: "", accountName: "", debit: 0, credit: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lineItems.length <= 2) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof LineItem, value: any) => {
    setLineItems((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
  };

  const handleAccountChange = (index: number, accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    setLineItems((prev) =>
      prev.map((line, i) =>
        i === index
          ? { ...line, accountId, accountName: account ? `${account.accountCode} - ${account.accountName}` : "" }
          : line
      )
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    const validLines = lineItems.filter((l) => l.accountId);
    if (validLines.length < 2) {
      toast.error("At least 2 line items with accounts are required");
      return;
    }

    if (!isBalanced) {
      toast.error("Total debits must equal total credits");
      return;
    }

    const newJournal: RecurringJournal = {
      id: `rj-${Date.now()}`,
      name,
      description,
      frequency,
      nextRunDate: startDate,
      lineItems: validLines,
      totalAmount: totalDebits,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    onSave(newJournal);
    toast.success("Recurring journal template created");
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Recurring Journal</h1>
          <p className="text-sm text-muted-foreground">
            Create a template for automatic journal entries
          </p>
        </div>
      </div>
      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Form (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Template Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Template Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Monthly Rent Payment"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this recurring entry is for..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <select
                    id="frequency"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as RecurringJournal["frequency"])}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Line Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-1" />
                Add Line
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {lineItems.map((line, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-2 items-end border rounded-lg p-3"
                >
                  {/* Account */}
                  <div className="col-span-5 space-y-1">
                    <Label className="text-xs">Account</Label>
                    <select
                      value={line.accountId}
                      onChange={(e) => handleAccountChange(index, e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Select account...</option>
                      {accounts
                        .filter((a) => a.isActive)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.accountCode} - {a.accountName}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Debit */}
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Debit</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.debit || ""}
                      onChange={(e) => updateLine(index, "debit", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="h-9"
                    />
                  </div>

                  {/* Credit */}
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Credit</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.credit || ""}
                      onChange={(e) => updateLine(index, "credit", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="h-9"
                    />
                  </div>

                  {/* Remove */}
                  <div className="col-span-1 flex justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-red-500 hover:text-red-700"
                      onClick={() => removeLine(index)}
                      disabled={lineItems.length <= 2}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right - Summary Sidebar (1/3) */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Template Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Debits</span>
                  <span className="text-lg font-bold text-emerald-600">
                    GHS {totalDebits.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Credits</span>
                  <span className="text-lg font-bold text-blue-600">
                    GHS {totalCredits.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Difference</span>
                  <span className={`text-lg font-bold ${isBalanced ? "text-emerald-600" : "text-red-600"}`}>
                    GHS {difference.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Balance indicator */}
                <div
                  className={`flex items-center gap-2 rounded-lg p-3 ${
                    isBalanced
                      ? "bg-emerald-50 dark:bg-emerald-950/20"
                      : "bg-red-50 dark:bg-red-950/20"
                  }`}
                >
                  {isBalanced ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        ✓ Template is balanced
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium text-red-700 dark:text-red-400">
                        Debits must equal credits
                      </span>
                    </>
                  )}
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={!isBalanced}
                    onClick={handleSave}
                  >
                    Save Template
                  </Button>
                  <Button variant="outline" className="w-full" onClick={onBack}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
