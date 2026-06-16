import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ArrowLeft, Plus, Trash2, Check, AlertCircle, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
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
      .get("/accounts", { pageSize: 500 })
      .then((res: any) => setAccounts(Array.isArray(res) ? res : res.data || []))
      .catch(console.error);
  }, []);

  // Group accounts by type for the combobox (like Next.js app)
  const TYPE_LABELS: Record<string, string> = {
    asset: "Assets",
    liability: "Liabilities",
    equity: "Equity",
    revenue: "Revenue",
    expense: "Expenses",
  };

  const grouped = useMemo(() => {
    return accounts
      .filter((a) => a.isActive)
      .reduce<Record<string, Account[]>>((acc, a) => {
        const type = a.accountType || "other";
        (acc[type] ||= []).push(a);
        return acc;
      }, {});
  }, [accounts]);

  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  );

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
                  className="p-4 border rounded-lg space-y-4"
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-sm">Line {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                      onClick={() => removeLine(index)}
                      disabled={lineItems.length <= 2}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Account Combobox */}
                  <div className="space-y-1">
                    <Label className="text-xs">Account *</Label>
                    <AccountCombobox
                      value={line.accountId}
                      onChange={(val) => updateLine(index, "accountId", val)}
                      accounts={accounts}
                      grouped={grouped}
                      accountMap={accountMap}
                      typeLabels={TYPE_LABELS}
                    />
                  </div>

                  {/* Line Description */}
                  <div className="space-y-1">
                    <Label className="text-xs">Line Description (optional)</Label>
                    <Input
                      value={line.description}
                      onChange={(e) =>
                        updateLine(index, "description", e.target.value)
                      }
                      placeholder="Optional line note"
                      className="h-9"
                    />
                  </div>

                  {/* Debit / Credit */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Debit (GHS)</Label>
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
                    <div className="space-y-1">
                      <Label className="text-xs">Credit (GHS)</Label>
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

// ─── Account Combobox (searchable, grouped by type — like Next.js app) ──────
function AccountCombobox({
  value,
  onChange,
  accounts,
  grouped,
  accountMap,
  typeLabels,
}: {
  value: string;
  onChange: (val: string) => void;
  accounts: Account[];
  grouped: Record<string, Account[]>;
  accountMap: Map<string, Account>;
  typeLabels: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? accountMap.get(value) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-9 font-normal text-sm",
            !value && "text-muted-foreground"
          )}
        >
          {selected
            ? `${selected.accountCode} — ${selected.accountName}`
            : "Select account..."}
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search accounts..." />
          <CommandList>
            <CommandEmpty>No account found.</CommandEmpty>
            {Object.entries(grouped).map(([type, accts]) => (
              <CommandGroup key={type} heading={typeLabels[type] || type}>
                {accts.map((account) => (
                  <CommandItem
                    key={account.id}
                    value={`${account.accountCode} ${account.accountName}`}
                    onSelect={() => {
                      onChange(account.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === account.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="font-mono text-xs mr-2 text-muted-foreground">
                      {account.accountCode}
                    </span>
                    {account.accountName}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
