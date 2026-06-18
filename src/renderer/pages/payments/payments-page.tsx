/**
 * Payments Received Page
 * Full CRUD with create form, detail view, and refund.
 */

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, DollarSign, Hash, CalendarDays, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { PaymentTable } from "./components/payment-table";
import { PaymentCreateForm } from "./components/payment-create-form";
import { PaymentDetail } from "./components/payment-detail";
import type { PaymentReceived } from "./types";

export function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentReceived[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedPaymentId, setSelectedPaymentId] = useState("");

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get("/payments", { pageSize: 200, paymentType: "received" });
      setPayments(result.data || []);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  if (view === "create") {
    return <PaymentCreateForm onBack={() => { setView("list"); loadPayments(); }} />;
  }

  if (view === "detail" && selectedPaymentId) {
    return <PaymentDetail paymentId={selectedPaymentId} onBack={() => { setView("list"); loadPayments(); }} />;
  }

  const totalPayments = payments.length;
  const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const thisMonth = payments.filter(p => {
    const payDate = new Date(p.paymentDate);
    const now = new Date();
    return payDate.getMonth() === now.getMonth() && payDate.getFullYear() === now.getFullYear();
  });
  const thisMonthAmount = thisMonth.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Heading title="Payments Received" description="Track customer payments and receipts" />
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setView("create")}>
          <Plus className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
      </div>
      <Separator />

      {/* Info */}
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
        <Info className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
        <p className="text-sm text-emerald-800 dark:text-emerald-300">
          Record payments received from customers. Payments can be linked to specific invoices to update their balance, or recorded as standalone receipts.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPayments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <CalendarDays className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{thisMonth.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(thisMonthAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPayments > 0 ? totalAmount / totalPayments : 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <PaymentTable
        payments={payments}
        loading={loading}
        onRefresh={loadPayments}
        onView={(p) => { setSelectedPaymentId(p.id); setView("detail"); }}
      />
    </div>
  );
}
