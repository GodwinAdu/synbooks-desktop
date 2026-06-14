/**
 * Payroll History Page
 * Shows past payroll runs with detail view and status filtering.
 */

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/table";
import { type ColumnDef } from "@tanstack/react-table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, History, Eye } from "lucide-react";

interface PayrollRun {
  id: string;
  runNumber?: string;
  payPeriod: string;
  payDate: string;
  status: "draft" | "completed" | "cancelled";
  employees?: any[];
  totalGross?: number;
  totalDeductions?: number;
  totalNet?: number;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  completed: {
    label: "Completed",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

export function PayrollHistoryPage() {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/payroll", { pageSize: 100 })
      .then((res: any) => setRuns(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredRuns =
    statusFilter === "all"
      ? runs
      : runs.filter((r) => r.status === statusFilter);

  const columns: ColumnDef<PayrollRun>[] = [
    {
      accessorKey: "runNumber",
      header: "Run #",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.runNumber || row.original.id?.slice(0, 8)}
        </span>
      ),
    },
    {
      accessorKey: "payPeriod",
      header: "Period",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.payPeriod}</span>
      ),
    },
    {
      accessorKey: "payDate",
      header: "Pay Date",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.payDate ? formatDate(row.original.payDate) : "—"}
        </span>
      ),
    },
    {
      id: "employeeCount",
      header: "Employees",
      cell: ({ row }) => (
        <span>{row.original.employees?.length || 0}</span>
      ),
    },
    {
      accessorKey: "totalGross",
      header: "Gross",
      cell: ({ row }) => (
        <span className="font-mono">
          {formatCurrency(row.original.totalGross || 0, "GHS")}
        </span>
      ),
    },
    {
      accessorKey: "totalNet",
      header: "Net",
      cell: ({ row }) => (
        <span className="font-mono font-medium">
          {formatCurrency(row.original.totalNet || 0, "GHS")}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const cfg = statusConfig[row.original.status] || statusConfig.draft;
        return <Badge className={cfg.className}>{cfg.label}</Badge>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedRun(row.original)}
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      ),
    },
  ];

  // Detail view
  if (selectedRun) {
    const employees = selectedRun.employees || [];
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedRun(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              Payroll Run: {selectedRun.payPeriod}
            </h1>
            <p className="text-sm text-muted-foreground">
              Pay Date: {selectedRun.payDate ? formatDate(selectedRun.payDate) : "—"} •{" "}
              {employees.length} employees
            </p>
          </div>
          <Badge
            className={
              statusConfig[selectedRun.status]?.className || ""
            }
          >
            {statusConfig[selectedRun.status]?.label || selectedRun.status}
          </Badge>
        </div>

        <Separator />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Gross</p>
              <p className="text-2xl font-bold font-mono">
                {formatCurrency(selectedRun.totalGross || 0, "GHS")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Deductions</p>
              <p className="text-2xl font-bold font-mono text-red-600">
                -{formatCurrency(selectedRun.totalDeductions || 0, "GHS")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Net Pay</p>
              <p className="text-2xl font-bold font-mono text-emerald-600">
                {formatCurrency(selectedRun.totalNet || 0, "GHS")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Employee Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No employee data available for this run.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-4 font-medium">Employee</th>
                      <th className="py-2 pr-4 font-medium text-right">Basic</th>
                      <th className="py-2 pr-4 font-medium text-right">Allowances</th>
                      <th className="py-2 pr-4 font-medium text-right">Gross</th>
                      <th className="py-2 pr-4 font-medium text-right">SSNIT</th>
                      <th className="py-2 pr-4 font-medium text-right">PAYE</th>
                      <th className="py-2 pr-4 font-medium text-right">Deductions</th>
                      <th className="py-2 font-medium text-right">Net Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp: any, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="py-2 pr-4 font-medium">
                          {emp.name || "—"}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono">
                          {formatCurrency(emp.baseSalary || 0, "GHS")}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono">
                          {formatCurrency(emp.allowances || 0, "GHS")}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono">
                          {formatCurrency(emp.grossPay || 0, "GHS")}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono">
                          {formatCurrency(emp.ssnitEmployee || 0, "GHS")}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono">
                          {formatCurrency(emp.paye || 0, "GHS")}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono">
                          {formatCurrency(emp.totalDeductions || 0, "GHS")}
                        </td>
                        <td className="py-2 text-right font-mono font-semibold">
                          {formatCurrency(emp.netPay || 0, "GHS")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Heading
          title="Payroll History"
          description="View past payroll runs and details"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Separator />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredRuns}
          searchKey="payPeriod"
          searchPlaceholder="Search by period..."
          pageSize={20}
          emptyMessage="No payroll history found."
          emptyIcon={
            <History className="size-10 text-muted-foreground/50 mb-2" />
          }
        />
      )}
    </div>
  );
}
