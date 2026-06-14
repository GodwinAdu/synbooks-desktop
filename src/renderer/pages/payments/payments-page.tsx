/**
 * Payments Received Page - Main container
 * Tracks customer payments received.
 */

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, DollarSign, Hash, CalendarDays } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { PaymentTable } from "./components/payment-table";
import type { PaymentReceived } from "./types";

export function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentReceived[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get("/payments", { pageSize: 100 }).catch(() => ({ data: [] }));
      setPayments(result.data || []);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const totalPayments = payments.length;
  const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const thisMonth = payments.filter(p => {
    const payDate = new Date(p.paymentDate);
    const now = new Date();
    return payDate.getMonth() === now.getMonth() && payDate.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Heading title="Payments Received" description="Track customer payments" />
        <Button onClick={() => toast.info("Coming soon")}>
          <Plus className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
      </div>
      <Separator />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
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
            <div className="text-2xl font-bold text-blue-600">{thisMonth}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <PaymentTable
        payments={payments}
        loading={loading}
        onRefresh={loadPayments}
      />
    </div>
  );
}
