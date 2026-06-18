/**
 * Estimates Page - Main container
 * Manages quotes/estimates for customers.
 */

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calculator, CheckCircle, Clock, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { EstimateTable } from "./components/estimate-table";
import { EstimateCreateForm } from "./components/estimate-create-form";
import { EstimateDetail } from "./components/estimate-detail";
import type { Estimate } from "./types";

export function EstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedEstimateId, setSelectedEstimateId] = useState("");

  const loadEstimates = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get("/estimates", { pageSize: 100 }).catch(() => ({ data: [] }));
      setEstimates(result.data || []);
    } catch {
      setEstimates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEstimates(); }, [loadEstimates]);

  if (view === "create") {
    return <EstimateCreateForm onBack={() => { setView("list"); loadEstimates(); }} />;
  }

  if (view === "detail" && selectedEstimateId) {
    return (
      <EstimateDetail
        estimateId={selectedEstimateId}
        onBack={() => { setView("list"); loadEstimates(); }}
      />
    );
  }

  const totalEstimates = estimates.length;
  const accepted = estimates.filter(e => e.status === "accepted").length;
  const pending = estimates.filter(e => e.status === "sent" || e.status === "draft").length;
  const totalValue = estimates.reduce((s, e) => s + (e.totalAmount || 0), 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Heading title="Estimates" description="Create and manage quotes for customers" />
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setView("create")}>
          <Plus className="h-4 w-4 mr-2" />
          New Estimate
        </Button>
      </div>
      <Separator />

      {/* Info */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/20">
        <Info className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-800 dark:text-blue-300">
          Estimates are quotes you send to customers before they commit. Once accepted, convert them to invoices with one click.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEstimates}</div>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{accepted}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Declined</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{estimates.filter(e => e.status === "declined").length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <EstimateTable
        estimates={estimates}
        loading={loading}
        onRefresh={loadEstimates}
        onView={(est) => { setSelectedEstimateId(est.id); setView("detail"); }}
      />
    </div>
  );
}
