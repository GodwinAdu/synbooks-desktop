/**
 * Invoices Page - Main container
 * Orchestrates data fetching and renders sub-components.
 */

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Info } from "lucide-react";
import { InvoiceSummaryCards } from "./components/invoice-summary-cards";
import { InvoiceFilters } from "./components/invoice-filters";
import { InvoiceTable } from "./components/invoice-table";
import { InvoiceCreateForm } from "./components/invoice-create-form";
import { InvoiceDetail } from "./components/invoice-detail";
import type { Invoice, InvoiceSummary, PaginationState } from "./types";

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationState>({ page: 1, pageSize: 50, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ status: "all", search: "" });
  const [view, setView] = useState<"list" | "create" | "detail" | "edit">("list");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [editingInvoice, setEditingInvoice] = useState<any>(null);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: pagination.page,
        pageSize: pagination.pageSize,
      };
      if (filters.status !== "all") params.status = filters.status;
      if (filters.search) params.search = filters.search;

      const result = await api.get("/invoices", params);
      setInvoices(result.data || []);
      setPagination(prev => ({
        ...prev,
        total: result.total || 0,
        totalPages: result.totalPages || 1,
      }));
    } catch (error) {
      console.error("Failed to load invoices:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, filters]);

  const loadSummary = useCallback(async () => {
    try {
      // Build summary from local data
      const all = await api.get("/invoices", { pageSize: 1000 });
      const data = all.data || [];
      setSummary({
        totalInvoices: data.length,
        totalAmount: data.reduce((s: number, i: any) => s + (i.totalAmount || 0), 0),
        paidAmount: data.reduce((s: number, i: any) => s + (i.paidAmount || 0), 0),
        outstanding: data.reduce((s: number, i: any) => s + ((i.totalAmount || 0) - (i.paidAmount || 0)), 0),
        overdue: data.filter((i: any) => i.status === "overdue").length,
      });
    } catch {}
  }, []);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);
  useEffect(() => { loadSummary(); }, [loadSummary]);

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleCheckOverdue = async () => {
    try {
      const result: any = await api.post("/invoices/check-overdue");
      if (result.marked > 0) {
        toast.warning(`${result.marked} invoice(s) marked as overdue`);
        loadInvoices();
        loadSummary();
      } else {
        toast.success("No overdue invoices found");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to check overdue");
    }
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleInvoiceCreated = () => {
    setView("list");
    loadInvoices();
    loadSummary();
  };

  // Show create form
  if (view === "create") {
    return <InvoiceCreateForm onBack={handleInvoiceCreated} />;
  }

  // Show edit form
  if (view === "edit" && editingInvoice) {
    return <InvoiceCreateForm onBack={handleInvoiceCreated} initialData={editingInvoice} />;
  }

  // Show detail view
  if (view === "detail" && selectedInvoiceId) {
    return (
      <InvoiceDetail
        invoiceId={selectedInvoiceId}
        onBack={() => { setView("list"); loadInvoices(); loadSummary(); }}
        onEdit={(inv) => { setEditingInvoice(inv); setView("edit"); }}
      />
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Heading title="Invoices" description="Create and manage customer invoices" />
      <Separator />

      {/* Info Alert */}
      <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/20">
        <Info className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
        <div className="text-sm text-green-800 dark:text-green-300 space-y-1">
          <p className="font-semibold">Invoice Tips</p>
          <p><span className="font-medium">Draft vs Sent:</span> Draft invoices don't affect your accounts. Once sent, the invoice creates an Accounts Receivable entry.</p>
          <p><span className="font-medium">Partial payments:</span> Record partial payments — the outstanding balance updates automatically.</p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && <InvoiceSummaryCards summary={summary} />}

      {/* Filters + Create Button */}
      <InvoiceFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onCreateClick={() => setView("create")}
        onCheckOverdue={handleCheckOverdue}
      />

      {/* Invoice Table */}
      <InvoiceTable
        invoices={invoices}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onRefresh={loadInvoices}
        onView={(inv) => { setSelectedInvoiceId(inv.id); setView("detail"); }}
        onEdit={(inv) => { setEditingInvoice(inv); setView("edit"); }}
      />
    </div>
  );
}
