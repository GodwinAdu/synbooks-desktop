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
import { Plus, Calculator, CheckCircle, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { EstimateTable } from "./components/estimate-table";
import { EstimateCreateForm } from "./components/estimate-create-form";
import type { Estimate } from "./types";

export function EstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create">("list");

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

  const totalEstimates = estimates.length;
  const accepted = estimates.filter(e => e.status === "accepted").length;
  const pending = estimates.filter(e => e.status === "sent" || e.status === "draft").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Heading title="Estimates" description="Create and manage quotes for customers" />
        <Button onClick={() => setView("create")}>
          <Plus className="h-4 w-4 mr-2" />
          New Estimate
        </Button>
      </div>
      <Separator />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Estimates</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEstimates}</div>
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
      </div>

      {/* Table */}
      <EstimateTable
        estimates={estimates}
        loading={loading}
        onRefresh={loadEstimates}
      />
    </div>
  );
}
