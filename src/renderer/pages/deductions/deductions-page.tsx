/**
 * Deductions Page
 * Manage payroll deductions with Ghana-specific defaults (PAYE, SSNIT, Tier 2).
 * Inline add/edit/delete pattern matching expense-categories.
 */

import { useState } from "react";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface Deduction {
  id: string;
  name: string;
  type: "statutory" | "voluntary";
  calculation: "percentage" | "fixed";
  rate: number; // percentage rate or fixed amount
  active: boolean;
  description?: string;
}

const defaultDeductions: Deduction[] = [
  {
    id: "1",
    name: "PAYE (Income Tax)",
    type: "statutory",
    calculation: "percentage",
    rate: 0,
    active: true,
    description: "Calculated using Ghana 2026 tax brackets",
  },
  {
    id: "2",
    name: "SSNIT Employee",
    type: "statutory",
    calculation: "percentage",
    rate: 5.5,
    active: true,
    description: "Employee contribution to SSNIT",
  },
  {
    id: "3",
    name: "SSNIT Employer",
    type: "statutory",
    calculation: "percentage",
    rate: 13,
    active: true,
    description: "Employer contribution (not deducted from employee)",
  },
  {
    id: "4",
    name: "Tier 2",
    type: "statutory",
    calculation: "percentage",
    rate: 5,
    active: true,
    description: "Mandatory occupational pension",
  },
  {
    id: "5",
    name: "Staff Welfare",
    type: "voluntary",
    calculation: "fixed",
    rate: 50,
    active: false,
    description: "Voluntary staff welfare contribution",
  },
];

export function DeductionsPage() {
  const [deductions, setDeductions] = useState<Deduction[]>(defaultDeductions);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"statutory" | "voluntary">("voluntary");
  const [newCalc, setNewCalc] = useState<"percentage" | "fixed">("percentage");
  const [newRate, setNewRate] = useState<number>(0);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<"statutory" | "voluntary">("voluntary");
  const [editCalc, setEditCalc] = useState<"percentage" | "fixed">("percentage");
  const [editRate, setEditRate] = useState<number>(0);

  const handleAdd = () => {
    if (!newName.trim()) {
      toast.error("Deduction name is required");
      return;
    }
    const newDeduction: Deduction = {
      id: Date.now().toString(),
      name: newName.trim(),
      type: newType,
      calculation: newCalc,
      rate: newRate,
      active: true,
    };
    setDeductions([...deductions, newDeduction]);
    resetAddForm();
    toast.success("Deduction added");
  };

  const resetAddForm = () => {
    setNewName("");
    setNewType("voluntary");
    setNewCalc("percentage");
    setNewRate(0);
    setShowAddForm(false);
  };

  const startEdit = (deduction: Deduction) => {
    setEditingId(deduction.id);
    setEditName(deduction.name);
    setEditType(deduction.type);
    setEditCalc(deduction.calculation);
    setEditRate(deduction.rate);
  };

  const saveEdit = () => {
    if (!editName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    setDeductions(
      deductions.map((d) =>
        d.id === editingId
          ? {
              ...d,
              name: editName.trim(),
              type: editType,
              calculation: editCalc,
              rate: editRate,
            }
          : d
      )
    );
    setEditingId(null);
    toast.success("Deduction updated");
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const toggleActive = (id: string) => {
    setDeductions(
      deductions.map((d) => (d.id === id ? { ...d, active: !d.active } : d))
    );
  };

  const handleDelete = (id: string) => {
    setDeductions(deductions.filter((d) => d.id !== id));
    toast.success("Deduction removed");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Heading
          title="Deductions"
          description="Configure payroll deductions and statutory contributions"
        />
        <Button
          onClick={() => setShowAddForm(true)}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Deduction
        </Button>
      </div>
      <Separator />

      <div className="max-w-3xl space-y-6">
        {/* Add Form */}
        {showAddForm && (
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardHeader>
              <CardTitle className="text-sm">New Deduction</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Deduction name"
                />
                <Select
                  value={newType}
                  onValueChange={(v: any) => setNewType(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="statutory">Statutory</SelectItem>
                    <SelectItem value="voluntary">Voluntary</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={newCalc}
                  onValueChange={(v: any) => setNewCalc(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  value={newRate || ""}
                  onChange={(e) => setNewRate(parseFloat(e.target.value) || 0)}
                  placeholder={newCalc === "percentage" ? "Rate (%)" : "Amount (GHS)"}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={resetAddForm}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAdd}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Deductions List */}
        <Card>
          <CardHeader>
            <CardTitle>
              Deductions ({deductions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {deductions.map((deduction) => (
                <div key={deduction.id} className="py-4">
                  {editingId === deduction.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Deduction name"
                          autoFocus
                        />
                        <Select
                          value={editType}
                          onValueChange={(v: any) => setEditType(v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="statutory">Statutory</SelectItem>
                            <SelectItem value="voluntary">Voluntary</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={editCalc}
                          onValueChange={(v: any) => setEditCalc(v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="fixed">Fixed Amount</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          value={editRate || ""}
                          onChange={(e) =>
                            setEditRate(parseFloat(e.target.value) || 0)
                          }
                          placeholder={
                            editCalc === "percentage"
                              ? "Rate (%)"
                              : "Amount (GHS)"
                          }
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-emerald-600"
                          onClick={saveEdit}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelEdit}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {deduction.name}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              deduction.type === "statutory"
                                ? "border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400"
                                : "border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400"
                            }
                          >
                            {deduction.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {deduction.calculation === "percentage"
                              ? `${deduction.rate}%`
                              : `GHS ${deduction.rate.toFixed(2)}`}
                          </Badge>
                        </div>
                        {deduction.description && (
                          <p className="text-xs text-muted-foreground">
                            {deduction.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={deduction.active}
                            onCheckedChange={() => toggleActive(deduction.id)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {deduction.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => startEdit(deduction)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(deduction.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {deductions.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No deductions configured. Add one above.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
