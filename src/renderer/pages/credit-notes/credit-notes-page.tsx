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
import { Plus, FileOutput, FileText, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { CreditNoteTable } from "./components/credit-note-table";
import { CreditNoteCreateForm } from "./components/credit-note-create-form";
import type { CreditNote } from "./types";

export function CreditNotesPage() {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "create">("list");

  const loadCreditNotes = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get("/credit-notes", { pageSize: 100 }).catch(() => ({ data: [] }));
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

  const totalCreditNotes = creditNotes.length;
  const issued = creditNotes.filter(cn => cn.status === "issued").length;
  const totalValue = creditNotes.reduce((sum, cn) => sum + (cn.totalAmount || 0), 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Heading title="Credit Notes" description="Issue refunds and credits to customers" />
        <Button onClick={() => setView("create")}>
          <Plus className="h-4 w-4 mr-2" />
          New Credit Note
        </Button>
      </div>
      <Separator />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credit Notes</CardTitle>
            <FileOutput className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCreditNotes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issued</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{issued}</div>
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
      />
    </div>
  );
}
