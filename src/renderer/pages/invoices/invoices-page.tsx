/**
 * Invoices Page - Main container
 * Orchestrates data fetching and renders sub-components.
 */

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { InvoiceSummaryCards } from "./components/invoice-summary-cards";
import { InvoiceFilters } from "./components/invoice-filters";
import { InvoiceTable } from "./components/invoice-table";
import { InvoiceCreateForm } from "./components/invoice-create-form";
import type { Invoice, InvoiceSummary, PaginationState } from "./types";

export function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationState>({ page: 1, pageSize: 50, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({ status: "all", search: "" });
  const [view, setView] = useState<"list" | "create">("list");

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

  return (
    <div className="space-y-6 p-6">
      <Heading title="Invoices" description="Create and manage customer invoices" />
      <Separator />

      {/* Summary Cards */}
      {summary && <InvoiceSummaryCards summary={summary} />}

      {/* Filters + Create Button */}
      <InvoiceFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onCreateClick={() => setView("create")}
      />

      {/* Invoice Table */}
      <InvoiceTable
        invoices={invoices}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        onRefresh={loadInvoices}
      />
    </div>
  );
}
