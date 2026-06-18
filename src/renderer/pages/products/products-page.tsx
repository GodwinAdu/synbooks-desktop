/**
 * Products Page - Main container
 * Orchestrates data fetching and renders sub-components.
 * Pattern matches Bills and Invoices pages.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Package, CheckCircle, AlertTriangle, XCircle, Plus, Search,
} from "lucide-react";
import { ProductTable } from "./components/product-table";
import { ProductCreateForm } from "./components/product-create-form";
import { ProductDetail } from "./components/product-detail";

type ViewState = "list" | "create" | "edit" | "detail";

export function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "all", search: "" });
  const [view, setView] = useState<ViewState>("list");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { pageSize: 200 };
      if (filters.status !== "all") params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const result = await api.get("/products", params);
      setProducts(result.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const handleBack = () => {
    setView("list");
    setSelectedProduct(null);
    load();
  };

  const handleView = (product: any) => {
    setSelectedProduct(product);
    setView("detail");
  };

  const handleEdit = (product: any) => {
    setSelectedProduct(product);
    setView("edit");
  };

  // Summary calculations
  const summary = useMemo(() => {
    const total = products.length;
    const active = products.filter(p => (p.status || "active") === "active").length;
    const lowStock = products.filter(p => {
      if (!p.trackInventory && p.trackInventory !== undefined) return false;
      const stock = p.currentStock ?? p.stock ?? null;
      const reorder = p.reorderLevel ?? 0;
      return stock !== null && stock > 0 && stock <= reorder;
    }).length;
    const outOfStock = products.filter(p => {
      if (!p.trackInventory && p.trackInventory !== undefined) return false;
      const stock = p.currentStock ?? p.stock ?? null;
      return stock !== null && stock <= 0;
    }).length;
    return { total, active, lowStock, outOfStock };
  }, [products]);

  // Detail view
  if (view === "detail" && selectedProduct) {
    return (
      <ProductDetail
        product={selectedProduct}
        onBack={handleBack}
        onEdit={() => { setView("edit"); }}
        onRefresh={load}
      />
    );
  }

  // Create / Edit form
  if (view === "create" || view === "edit") {
    return (
      <ProductCreateForm
        initialData={view === "edit" ? selectedProduct : undefined}
        onBack={handleBack}
      />
    );
  }

  // List view
  return (
    <div className="space-y-6 p-6">
      <Heading title="Products & Services" description="Manage your product catalog" />
      <Separator />

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All products &amp; services</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{summary.active}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{summary.lowStock}</div>
            <p className="text-xs text-muted-foreground mt-1">Below reorder level</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.outOfStock}</div>
            <p className="text-xs text-muted-foreground mt-1">Need restocking</p>
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
              placeholder="Search products..."
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
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>

        {/* Actions */}
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setView("create")}>
          <Plus className="size-4 mr-1" />
          New Product
        </Button>
      </div>

      {/* Product Table */}
      <ProductTable
        products={products}
        loading={loading}
        onRefresh={load}
        onView={handleView}
        onEdit={handleEdit}
      />
    </div>
  );
}
