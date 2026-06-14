/**
 * Payroll Run Form
 * Full-page form for creating and processing a payroll run.
 * Includes Ghana PAYE, SSNIT (5.5% employee, 13% employer), and Tier 2 calculations.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Users, Calculator, Save, Play } from "lucide-react";

// ─── Ghana PAYE 2026 Monthly Tax Brackets ──────────────────────────────────
const PAYE_BRACKETS = [
  { threshold: 490, rate: 0 },
  { threshold: 110, rate: 0.05 },
  { threshold: 130, rate: 0.10 },
  { threshold: 3166.67, rate: 0.175 },
  { threshold: 16000, rate: 0.25 },
  { threshold: 30166.67, rate: 0.30 },
  { threshold: Infinity, rate: 0.35 },
];

const SSNIT_EMPLOYEE_RATE = 0.055; // 5.5%
const SSNIT_EMPLOYER_RATE = 0.13;  // 13%
const TIER2_RATE = 0.05;           // 5%

function calculatePAYE(taxableIncome: number): number {
  let remaining = taxableIncome;
  let tax = 0;

  for (const bracket of PAYE_BRACKETS) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, bracket.threshold);
    tax += taxable * bracket.rate;
    remaining -= taxable;
  }

  return Math.max(0, tax);
}

interface EmployeePayroll {
  id: string;
  name: string;
  department: string;
  baseSalary: number;
  allowances: number;
  taxableAllowances: number;
  grossPay: number;
  ssnitEmployee: number;
  ssnitEmployer: number;
  tier2: number;
  paye: number;
  totalDeductions: number;
  netPay: number;
}

interface Props {
  onCancel: () => void;
  onSaved: () => void;
}

export function PayrollRunForm({ onCancel, onSaved }: Props) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Run details
  const [payPeriod, setPayPeriod] = useState("");
  const [payDate, setPayDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    api
      .get("/employees", { pageSize: 200 })
      .then((res: any) => {
        const active = (res.data || []).filter(
          (e: any) => e.status === "active"
        );
        setEmployees(active);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleEmployee = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(employees.map((e) => e.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Payroll calculations
  const calculations: EmployeePayroll[] = useMemo(() => {
    return employees
      .filter((e) => selectedIds.has(e.id))
      .map((emp) => {
        const baseSalary = emp.baseSalary || 0;
        const allowancesList = emp.allowances || [];
        const totalAllowances = allowancesList.reduce(
          (sum: number, a: any) => sum + (a.amount || 0),
          0
        );
        const taxableAllowances = allowancesList
          .filter((a: any) => a.taxable !== false)
          .reduce((sum: number, a: any) => sum + (a.amount || 0), 0);

        const grossPay = baseSalary + totalAllowances;

        // SSNIT calculated on basic salary only
        const ssnitEmployee = baseSalary * SSNIT_EMPLOYEE_RATE;
        const ssnitEmployer = baseSalary * SSNIT_EMPLOYER_RATE;
        const tier2 = baseSalary * TIER2_RATE;

        // Taxable income = gross - SSNIT employee contribution (tax relief)
        const taxableIncome = baseSalary + taxableAllowances - ssnitEmployee;
        const paye = calculatePAYE(taxableIncome);

        const totalDeductions = ssnitEmployee + tier2 + paye;
        const netPay = grossPay - totalDeductions;

        const name =
          emp.name ||
          `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
          "Unknown";

        return {
          id: emp.id,
          name,
          department: emp.department || "—",
          baseSalary,
          allowances: totalAllowances,
          taxableAllowances,
          grossPay,
          ssnitEmployee,
          ssnitEmployer,
          tier2,
          paye,
          totalDeductions,
          netPay,
        };
      });
  }, [employees, selectedIds]);

  const totals = useMemo(() => {
    return calculations.reduce(
      (acc, c) => ({
        gross: acc.gross + c.grossPay,
        deductions: acc.deductions + c.totalDeductions,
        net: acc.net + c.netPay,
        ssnitEmployee: acc.ssnitEmployee + c.ssnitEmployee,
        ssnitEmployer: acc.ssnitEmployer + c.ssnitEmployer,
        tier2: acc.tier2 + c.tier2,
        paye: acc.paye + c.paye,
      }),
      {
        gross: 0,
        deductions: 0,
        net: 0,
        ssnitEmployee: 0,
        ssnitEmployer: 0,
        tier2: 0,
        paye: 0,
      }
    );
  }, [calculations]);

  const handleSave = async (process: boolean) => {
    if (!payPeriod) {
      toast.error("Pay period is required");
      return;
    }
    if (!payDate) {
      toast.error("Pay date is required");
      return;
    }
    if (selectedIds.size === 0) {
      toast.error("Select at least one employee");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        payPeriod,
        payDate,
        startDate,
        endDate,
        status: process ? "completed" : "draft",
        employees: calculations.map((c) => ({
          employeeId: c.id,
          name: c.name,
          baseSalary: c.baseSalary,
          allowances: c.allowances,
          grossPay: c.grossPay,
          ssnitEmployee: c.ssnitEmployee,
          ssnitEmployer: c.ssnitEmployer,
          tier2: c.tier2,
          paye: c.paye,
          totalDeductions: c.totalDeductions,
          netPay: c.netPay,
        })),
        totalGross: totals.gross,
        totalDeductions: totals.deductions,
        totalNet: totals.net,
      };

      const res: any = await api.post("/payroll", payload);

      if (process && res.id) {
        await api.post(`/payroll/${res.id}/process`);
      }

      toast.success(
        process ? "Payroll processed successfully" : "Payroll saved as draft"
      );
      onSaved();
    } catch (e: any) {
      toast.error(e.message || "Failed to save payroll");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Run Payroll</h1>
          <p className="text-sm text-muted-foreground">
            Calculate and process employee pay
          </p>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Run Details */}
          <Card>
            <CardHeader>
              <CardTitle>Run Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pay Period *</Label>
                <Input
                  value={payPeriod}
                  onChange={(e) => setPayPeriod(e.target.value)}
                  placeholder="e.g. June 2026"
                />
              </div>
              <div className="space-y-2">
                <Label>Pay Date *</Label>
                <Input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Employee Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Select Employees
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll}>
                    Deselect All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">
                  Loading employees...
                </p>
              ) : employees.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active employees found. Add employees first.
                </p>
              ) : (
                <div className="divide-y max-h-72 overflow-y-auto">
                  {employees.map((emp) => {
                    const name =
                      emp.name ||
                      `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
                    return (
                      <label
                        key={emp.id}
                        className="flex items-center gap-3 py-3 px-2 hover:bg-muted/50 rounded cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedIds.has(emp.id)}
                          onCheckedChange={() => toggleEmployee(emp.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {emp.department || "No department"}
                          </p>
                        </div>
                        <span className="text-sm font-mono">
                          {formatCurrency(emp.baseSalary || 0, "GHS")}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calculation Preview */}
          {calculations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Calculation Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 pr-4 font-medium">Employee</th>
                        <th className="py-2 pr-4 font-medium text-right">
                          Basic
                        </th>
                        <th className="py-2 pr-4 font-medium text-right">
                          Allowances
                        </th>
                        <th className="py-2 pr-4 font-medium text-right">
                          Gross
                        </th>
                        <th className="py-2 pr-4 font-medium text-right">
                          SSNIT (5.5%)
                        </th>
                        <th className="py-2 pr-4 font-medium text-right">
                          Tier 2 (5%)
                        </th>
                        <th className="py-2 pr-4 font-medium text-right">
                          PAYE
                        </th>
                        <th className="py-2 pr-4 font-medium text-right">
                          Deductions
                        </th>
                        <th className="py-2 font-medium text-right">
                          Net Pay
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculations.map((c) => (
                        <tr key={c.id} className="border-b">
                          <td className="py-2 pr-4">
                            <p className="font-medium">{c.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.department}
                            </p>
                          </td>
                          <td className="py-2 pr-4 text-right font-mono">
                            {formatCurrency(c.baseSalary, "GHS")}
                          </td>
                          <td className="py-2 pr-4 text-right font-mono">
                            {formatCurrency(c.allowances, "GHS")}
                          </td>
                          <td className="py-2 pr-4 text-right font-mono">
                            {formatCurrency(c.grossPay, "GHS")}
                          </td>
                          <td className="py-2 pr-4 text-right font-mono">
                            {formatCurrency(c.ssnitEmployee, "GHS")}
                          </td>
                          <td className="py-2 pr-4 text-right font-mono">
                            {formatCurrency(c.tier2, "GHS")}
                          </td>
                          <td className="py-2 pr-4 text-right font-mono">
                            {formatCurrency(c.paye, "GHS")}
                          </td>
                          <td className="py-2 pr-4 text-right font-mono">
                            {formatCurrency(c.totalDeductions, "GHS")}
                          </td>
                          <td className="py-2 text-right font-mono font-semibold">
                            {formatCurrency(c.netPay, "GHS")}
                          </td>
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="font-semibold bg-muted/50">
                        <td className="py-2 pr-4">
                          Total ({calculations.length} employees)
                        </td>
                        <td className="py-2 pr-4 text-right font-mono">
                          {formatCurrency(
                            calculations.reduce(
                              (s, c) => s + c.baseSalary,
                              0
                            ),
                            "GHS"
                          )}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono">
                          {formatCurrency(
                            calculations.reduce(
                              (s, c) => s + c.allowances,
                              0
                            ),
                            "GHS"
                          )}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono">
                          {formatCurrency(totals.gross, "GHS")}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono">
                          {formatCurrency(totals.ssnitEmployee, "GHS")}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono">
                          {formatCurrency(totals.tier2, "GHS")}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono">
                          {formatCurrency(totals.paye, "GHS")}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono">
                          {formatCurrency(totals.deductions, "GHS")}
                        </td>
                        <td className="py-2 text-right font-mono">
                          {formatCurrency(totals.net, "GHS")}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Payroll Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Employees</span>
                  <span className="font-medium">{calculations.length}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Gross</span>
                  <span className="font-mono font-medium">
                    {formatCurrency(totals.gross, "GHS")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">SSNIT (Employee)</span>
                  <span className="font-mono text-red-600">
                    -{formatCurrency(totals.ssnitEmployee, "GHS")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tier 2</span>
                  <span className="font-mono text-red-600">
                    -{formatCurrency(totals.tier2, "GHS")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">PAYE</span>
                  <span className="font-mono text-red-600">
                    -{formatCurrency(totals.paye, "GHS")}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Total Deductions
                  </span>
                  <span className="font-mono font-medium text-red-600">
                    -{formatCurrency(totals.deductions, "GHS")}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium">Total Net Pay</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {formatCurrency(totals.net, "GHS")}
                  </span>
                </div>
                <Separator />
                <div className="text-xs text-muted-foreground">
                  <p>
                    SSNIT Employer (13%):{" "}
                    <span className="font-mono">
                      {formatCurrency(totals.ssnitEmployer, "GHS")}
                    </span>
                  </p>
                  <p className="mt-1 text-[11px]">
                    (Not deducted from employee)
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save as Draft
              </Button>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleSave(true)}
                disabled={saving}
              >
                <Play className="h-4 w-4 mr-2" />
                Process Payroll
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
