/**
 * Bills Page - Main container
 * Orchestrates data fetching and renders sub-components.
 * Pattern matches Invoices and Expenses pages.
 */

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Info, FileText, DollarSign, CheckCircle, Clock, AlertTriangle, Plus, Search,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { BillTable } from "./components/bill-table";
import { BillCreateForm } from "./components/bill-create-form";
import { BillDetail } from "./components/bill-detail";

export function BillsPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "all", search: "" });
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedBillId, setSelectedBillId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { pageSize: 200 };
      if (filters.status !== "all") params.status = filters.status;
      const result = await api.get("/bills", params);
      setBills(result.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  // Check overdue bills
  const handleCheckOverdue = async () => {
    try {
      const result: any = await api.post("/bills/check-overdue");
      if (result.marked > 0) {
        toast.warning(`${result.marked} bill(s) marked as overdue`);
        load();
      } else {
        toast.success("No overdue bills found");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to check overdue");
    }
  };

  // View routing
  if (view === "create") {
    return <BillCreateForm onBack={() => { setView("list"); load(); }} />;
  }

  if (view === "detail" && selectedBillId) {
    return (
      <BillDetail
        billId={selectedBillId}
        onBack={() => { setView("list"); load(); }}
      />
    );
  }

  // Summary calculations
  const totalBills = bills.length;
  const paidCount = bills.filter(b => b.status === "paid").length;
  const outstanding = bills
    .filter(b => b.status !== "paid" && b.status !== "cancelled")
    .reduce((s, b) => s + ((b.totalAmount || 0) - (b.paidAmount || 0)), 0);
  const overdueCount = bills.filter(b => b.status === "overdue").length;

  return (
    <div className="space-y-6 p-6">
      <Heading title="Bills" description="Manage vendor bills and payments" />
      <Separator />

      {/* Info Alert */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
        <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <p className="font-semibold">Bill Tips</p>
          <p><span className="font-medium">Draft → Open:</span> Approve a draft bill to make it payable. Bills post to GL on creation (Debit Expense, Credit Payable).</p>
          <p><span className="font-medium">Partial payments:</span> Record partial payments — the outstanding balance updates automatically and posts to GL.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBills}</div>
            <p className="text-xs text-muted-foreground mt-1">All bills</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{paidCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(outstanding)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-1 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search bills..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-9"
            />
          </div>

          {/* Status filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCheckOverdue}>
            <AlertTriangle className="size-4 mr-1" />
            Check Overdue
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setView("create")}>
            <Plus className="size-4 mr-1" />
            New Bill
          </Button>
        </div>
      </div>

      {/* Bill Table */}
      <BillTable
        bills={bills}
        loading={loading}
        onRefresh={load}
        onView={(bill) => { setSelectedBillId(bill.id); setView("detail"); }}
      />
    </div>
  );
}
