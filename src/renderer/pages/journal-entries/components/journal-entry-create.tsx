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

interface LineItem {
  accountId: string;
  description: string;
  debit: number;
  credit: number;
}

interface JournalEntryCreateProps {
  onBack: () => void;
}

export function JournalEntryCreate({ onBack }: JournalEntryCreateProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entryDate, setEntryDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { accountId: "", description: "", debit: 0, credit: 0 },
    { accountId: "", description: "", debit: 0, credit: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);

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
    setLineItems((prev) => [
      ...prev,
      { accountId: "", description: "", debit: 0, credit: 0 },
    ]);
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

  const handleSave = async (postAfterSave: boolean) => {
    if (!description.trim()) {
      toast.error("Description is required");
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

    setSubmitting(true);
    try {
      const payload = {
        entryDate,
        description,
        notes,
        lineItems: validLines.map((l) => ({
          accountId: l.accountId,
          description: l.description,
          debit: l.debit || 0,
          credit: l.credit || 0,
        })),
      };

      const res: any = await api.post("/journal-entries", payload);

      if (postAfterSave && res.id) {
        await api.post(`/journal-entries/${res.id}/post`);
        toast.success("Journal entry posted successfully");
      } else {
        toast.success("Journal entry saved as draft");
      }

      onBack();
    } catch (error: any) {
      toast.error(error.message || "Failed to save journal entry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Journal Entry</h1>
          <p className="text-sm text-muted-foreground">
            Create a new double-entry journal entry
          </p>
        </div>
      </div>
      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Form (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Entry Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Entry Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="entryDate">Date</Label>
                  <Input
                    id="entryDate"
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Monthly rent payment"
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
                  <div className="col-span-4 space-y-1">
                    <Label className="text-xs">Account</Label>
                    <select
                      value={line.accountId}
                      onChange={(e) =>
                        updateLine(index, "accountId", e.target.value)
                      }
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

                  {/* Line Description */}
                  <div className="col-span-3 space-y-1">
                    <Label className="text-xs">Description (optional)</Label>
                    <Input
                      value={line.description}
                      onChange={(e) =>
                        updateLine(index, "description", e.target.value)
                      }
                      placeholder="Line note"
                      className="h-9"
                    />
                  </div>

                  {/* Debit */}
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Debit</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.debit || ""}
                      onChange={(e) =>
                        updateLine(
                          index,
                          "debit",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="0.00"
                      className="h-9"
                    />
                  </div>

                  {/* Credit */}
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Credit</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.credit || ""}
                      onChange={(e) =>
                        updateLine(
                          index,
                          "credit",
                          parseFloat(e.target.value) || 0
                        )
                      }
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

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes for this journal entry..."
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right - Summary Sidebar (1/3) */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Entry Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Total Debits
                  </span>
                  <span className="text-lg font-bold text-emerald-600">
                    GHS{" "}
                    {totalDebits.toLocaleString("en-GH", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Total Credits
                  </span>
                  <span className="text-lg font-bold text-blue-600">
                    GHS{" "}
                    {totalCredits.toLocaleString("en-GH", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Difference
                  </span>
                  <span
                    className={`text-lg font-bold ${
                      isBalanced ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    GHS{" "}
                    {difference.toLocaleString("en-GH", {
                      minimumFractionDigits: 2,
                    })}
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
                        ✓ Entry is balanced
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
                    disabled={submitting || !isBalanced}
                    onClick={() => handleSave(false)}
                  >
                    {submitting ? "Saving..." : "Save as Draft"}
                  </Button>
                  <Button
                    className="w-full"
                    disabled={submitting || !isBalanced}
                    onClick={() => handleSave(true)}
                  >
                    {submitting ? "Posting..." : "Post Entry"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={onBack}
                  >
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
