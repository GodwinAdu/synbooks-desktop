/**
 * Credit Notes Page - Main container
 * Issue refunds and credits to customers.
 */

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileOutput, FileText, DollarSign, CheckCircle, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { CreditNoteTable } from "./components/credit-note-table";
import { CreditNoteCreateForm } from "./components/credit-note-create-form";
import { CreditNoteDetail } from "./components/credit-note-detail";
import type { CreditNote } from "./types";

export function CreditNotesPage() {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [selectedId, setSelectedId] = useState("");

  const loadCreditNotes = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get("/credit-notes", { pageSize: 100 });
      setCreditNotes(result.data || []);
    } catch {
      setCreditNotes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCreditNotes(); }, [loadCreditNotes]);

  if (view === "create") {
    return <CreditNoteCreateForm onBack={() => { setView("list"); loadCreditNotes(); }} />;
  }

  if (view === "detail" && selectedId) {
    return <CreditNoteDetail creditNoteId={selectedId} onBack={() => { setView("list"); loadCreditNotes(); }} />;
  }

  const totalCreditNotes = creditNotes.length;
  const issued = creditNotes.filter(cn => cn.status === "issued").length;
  const applied = creditNotes.filter(cn => cn.status === "applied").length;
  const totalValue = creditNotes.reduce((sum, cn) => sum + (cn.totalAmount || 0), 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Heading title="Credit Notes" description="Issue refunds and credits to customers" />
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setView("create")}>
          <Plus className="h-4 w-4 mr-2" />
          New Credit Note
        </Button>
      </div>
      <Separator />

      {/* Info */}
      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/20">
        <Info className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
        <p className="text-sm text-red-800 dark:text-red-300">
          Credit notes reduce what a customer owes. Issue them for returns, discounts, or billing errors. Apply them to an invoice to reduce its balance.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileOutput className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCreditNotes}</div>
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issued</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{issued}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting application</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applied</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{applied}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <CreditNoteTable
        creditNotes={creditNotes}
        loading={loading}
        onRefresh={loadCreditNotes}
        onView={(cn) => { setSelectedId(cn.id); setView("detail"); }}
      />
    </div>
  );
}
