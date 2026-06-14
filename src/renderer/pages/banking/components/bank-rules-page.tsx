import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Info,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { BankRule } from "../types";

export function BankRulesPage() {
  const [rules, setRules] = useState<BankRule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    pattern: "",
    matchField: "description" as "description" | "payee" | "reference",
    category: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.pattern.trim() || !form.category.trim()) {
      toast.error("Name, pattern, and category are required");
      return;
    }
    const newRule: BankRule = {
      id: crypto.randomUUID(),
      name: form.name,
      pattern: form.pattern,
      matchField: form.matchField,
      category: form.category,
      isActive: true,
    };
    setRules((prev) => [...prev, newRule]);
    setForm({ name: "", pattern: "", matchField: "description", category: "" });
    setShowForm(false);
    toast.success("Bank rule created");
  };

  const handleDelete = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    toast.success("Rule deleted");
  };

  const handleToggle = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-800 dark:text-blue-300">
              About Bank Rules
            </p>
            <p className="text-blue-700 dark:text-blue-400 mt-1">
              Bank rules automatically categorize transactions based on patterns
              in the description, payee, or reference fields. When a transaction
              matches a rule's pattern, it will be assigned the specified
              category automatically.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Bar */}
      <div className="flex justify-end">
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {/* Create Rule Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Bank Rule</CardTitle>
            <CardDescription>
              Define a pattern to automatically categorize transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddRule} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-name">Rule Name *</Label>
                  <Input
                    id="rule-name"
                    name="name"
                    placeholder="e.g. Utility Payments"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rule-pattern">Pattern *</Label>
                  <Input
                    id="rule-pattern"
                    name="pattern"
                    placeholder="e.g. ECG, Water Company"
                    value={form.pattern}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rule-matchField">Match Field</Label>
                  <select
                    id="rule-matchField"
                    name="matchField"
                    value={form.matchField}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="description">Description</option>
                    <option value="payee">Payee</option>
                    <option value="reference">Reference</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rule-category">Category *</Label>
                  <Input
                    id="rule-category"
                    name="category"
                    placeholder="e.g. Utilities"
                    value={form.category}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  Save Rule
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Rules List */}
      {rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileCheck className="h-10 w-10 mb-3" />
            <p className="font-medium">No bank rules configured</p>
            <p className="text-sm mt-1">
              Rules help auto-categorize imported transactions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Active Rules ({rules.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-background"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{rule.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {rule.matchField}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        → {rule.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pattern: "{rule.pattern}"
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={() => handleToggle(rule.id)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
