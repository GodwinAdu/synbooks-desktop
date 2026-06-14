import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ProductTable } from "./components/product-table";
import { ProductCreateForm } from "./components/product-create-form";
import { ProductDetail } from "./components/product-detail";

type ViewState = "list" | "create" | "edit" | "detail";

export function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewState>("list");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/products", { pageSize: 50 })
      .then((res: any) => setProducts(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  // Detail view
  if (view === "detail" && selectedProduct) {
    return (
      <ProductDetail
        product={selectedProduct}
        onBack={handleBack}
        onEdit={() => {
          setView("edit");
        }}
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Heading title="Products & Services" description="Manage your product catalog" />
        <Button onClick={() => setView("create")}>
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>
      <Separator />
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
