/**
 * Product Create/Edit Form
 * Full-page form with Tabs: "Product Details" and "Advanced (Optional)"
 * Supports both create and edit modes via initialData prop.
 */

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Save,
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  Star,
} from "lucide-react";

interface Props {
  initialData?: any;
  onBack: () => void;
}

// --- Types ---
interface PriceTier {
  tierName: string;
  minQuantity: number;
  price: number;
}

interface Variant {
  name: string;
  sku: string;
  attributes: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
}

interface Supplier {
  vendorId: string;
  supplierSku: string;
  costPrice: number;
  leadTime: number;
  isPreferred: boolean;
}

interface BundleItem {
  productId: string;
  quantity: number;
}

// --- Helpers ---
const generateSKU = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let sku = "PRD-";
  for (let i = 0; i < 6; i++) sku += chars.charAt(Math.floor(Math.random() * chars.length));
  return sku;
};

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]";

const UNIT_OPTIONS = [
  { value: "pcs", label: "Pieces (pcs)" },
  { value: "kg", label: "Kilograms (kg)" },
  { value: "ltr", label: "Litres (ltr)" },
  { value: "box", label: "Box" },
  { value: "pack", label: "Pack" },
  { value: "doz", label: "Dozen (doz)" },
  { value: "m", label: "Metres (m)" },
  { value: "ft", label: "Feet (ft)" },
  { value: "hr", label: "Hours (hr)" },
];

const TYPE_OPTIONS = [
  { value: "product", label: "Product" },
  { value: "service", label: "Service" },
  { value: "bundle", label: "Bundle" },
  { value: "raw_material", label: "Raw Material" },
  { value: "finished_good", label: "Finished Good" },
];

const SERVICE_TYPE_OPTIONS = [
  { value: "one_time", label: "One-time" },
  { value: "recurring", label: "Recurring" },
  { value: "hourly", label: "Hourly" },
  { value: "project_based", label: "Project-based" },
];

export function ProductCreateForm({ initialData, onBack }: Props) {
  const isEdit = !!initialData;
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  // --- Lookups ---
  const [categories, setCategories] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<any[]>([]);

  useEffect(() => {
    // Load product categories from database
    api.get("/categories/product").then((res: any) => {
      const cats = Array.isArray(res) ? res : res.data || [];
      setCategories(cats.map((c: any) => c.name));
    }).catch(() => {});
    api.get("/accounts", { pageSize: 200 }).then((r: any) => setAccounts(Array.isArray(r) ? r : r.data || [])).catch(() => {});
    api.get("/vendors", { pageSize: 200 }).then((r: any) => setVendors(r.data || [])).catch(() => {});
    api.get("/products", { pageSize: 200 }).then((r: any) => setProductsList(r.data || [])).catch(() => {});
  }, []);

  // Filter accounts by type
  const revenueAccounts = useMemo(() => accounts.filter((a: any) => a.accountType === "revenue"), [accounts]);
  const expenseAccounts = useMemo(() => accounts.filter((a: any) => a.accountType === "expense"), [accounts]);
  const assetAccounts = useMemo(() => accounts.filter((a: any) => a.accountType === "asset"), [accounts]);

  // --- Form State ---
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    barcode: "",
    type: "product",
    category: "",
    unit: "pcs",
    description: "",
    // Pricing
    sellingPrice: 0,
    costPrice: 0,
    // Inventory
    trackInventory: true,
    currentStock: 0,
    reorderLevel: 10,
    reorderQuantity: 20,
    // Tax
    taxable: false,
    taxRate: 0,
    // Accounting (Advanced)
    salesAccountId: "",
    purchaseAccountId: "",
    inventoryAccountId: "",
    // Variants
    hasVariants: false,
    // Service details
    duration: "",
    serviceType: "",
    // Status
    status: "active",
  });

  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([]);

  // Populate from initialData
  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        name: initialData.name || "",
        sku: initialData.sku || "",
        barcode: initialData.barcode || "",
        type: initialData.type || "product",
        category: initialData.category || initialData.categoryId || "",
        unit: initialData.unit || "pcs",
        description: initialData.description || "",
        sellingPrice: initialData.sellingPrice || initialData.price || 0,
        costPrice: initialData.costPrice || 0,
        trackInventory: initialData.trackInventory ?? true,
        currentStock: initialData.currentStock ?? initialData.stock ?? 0,
        reorderLevel: initialData.reorderLevel ?? 10,
        reorderQuantity: initialData.reorderQuantity ?? 20,
        taxable: initialData.taxable ?? false,
        taxRate: initialData.taxRate ?? 0,
        salesAccountId: initialData.salesAccountId || "",
        purchaseAccountId: initialData.purchaseAccountId || "",
        inventoryAccountId: initialData.inventoryAccountId || "",
        hasVariants: initialData.hasVariants ?? false,
        duration: initialData.duration || "",
        serviceType: initialData.serviceType || "",
        status: initialData.status || "active",
      }));
      if (initialData.priceTiers) setPriceTiers(initialData.priceTiers);
      if (initialData.variants) setVariants(initialData.variants);
      if (initialData.suppliers) setSuppliers(initialData.suppliers);
      if (initialData.bundleItems) setBundleItems(initialData.bundleItems);
    }
  }, [initialData]);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Margin calculation
  const margin = useMemo(() => {
    if (formData.sellingPrice > 0) {
      return (((formData.sellingPrice - formData.costPrice) / formData.sellingPrice) * 100).toFixed(1);
    }
    return "0.0";
  }, [formData.sellingPrice, formData.costPrice]);

  // --- Price Tiers ---
  const addPriceTier = () => setPriceTiers((prev) => [...prev, { tierName: "", minQuantity: 1, price: 0 }]);
  const removePriceTier = (idx: number) => setPriceTiers((prev) => prev.filter((_, i) => i !== idx));
  const updatePriceTier = (idx: number, field: string, value: any) => {
    setPriceTiers((prev) => prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));
  };

  // --- Variants ---
  const addVariant = () => setVariants((prev) => [...prev, { name: "", sku: "", attributes: "", costPrice: 0, sellingPrice: 0, stock: 0 }]);
  const removeVariant = (idx: number) => setVariants((prev) => prev.filter((_, i) => i !== idx));
  const updateVariant = (idx: number, field: string, value: any) => {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  };

  // --- Suppliers ---
  const addSupplier = () => setSuppliers((prev) => [...prev, { vendorId: "", supplierSku: "", costPrice: 0, leadTime: 0, isPreferred: false }]);
  const removeSupplier = (idx: number) => setSuppliers((prev) => prev.filter((_, i) => i !== idx));
  const updateSupplier = (idx: number, field: string, value: any) => {
    setSuppliers((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  // --- Bundle Items ---
  const addBundleItem = () => setBundleItems((prev) => [...prev, { productId: "", quantity: 1 }]);
  const removeBundleItem = (idx: number) => setBundleItems((prev) => prev.filter((_, i) => i !== idx));
  const updateBundleItem = (idx: number, field: string, value: any) => {
    setBundleItems((prev) => prev.map((b, i) => (i === idx ? { ...b, [field]: value } : b)));
  };

  // --- Submit ---
  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (formData.sellingPrice <= 0) {
      toast.error("Selling price must be greater than 0");
      return;
    }

    const payload: any = {
      name: formData.name,
      sku: formData.sku || undefined,
      barcode: formData.barcode || undefined,
      type: formData.type,
      category: formData.category || undefined,
      unit: formData.unit,
      description: formData.description || undefined,
      sellingPrice: formData.sellingPrice,
      costPrice: formData.costPrice,
      trackInventory: formData.trackInventory,
      currentStock: formData.trackInventory ? formData.currentStock : undefined,
      reorderLevel: formData.trackInventory ? formData.reorderLevel : undefined,
      reorderQuantity: formData.trackInventory ? formData.reorderQuantity : undefined,
      taxable: formData.taxable,
      taxRate: formData.taxable ? formData.taxRate : 0,
      salesAccountId: formData.salesAccountId || undefined,
      purchaseAccountId: formData.purchaseAccountId || undefined,
      inventoryAccountId: formData.inventoryAccountId || undefined,
      hasVariants: formData.hasVariants,
      status: formData.status,
      priceTiers: priceTiers.length > 0 ? priceTiers : undefined,
      variants: formData.hasVariants && variants.length > 0 ? variants : undefined,
      suppliers: suppliers.length > 0 ? suppliers : undefined,
      bundleItems: formData.type === "bundle" && bundleItems.length > 0 ? bundleItems : undefined,
      duration: formData.type === "service" ? formData.duration || undefined : undefined,
      serviceType: formData.type === "service" ? formData.serviceType || undefined : undefined,
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.put(`/products/${initialData.id}`, payload);
        toast.success("Product updated successfully");
      } else {
        await api.post("/products", payload);
        toast.success("Product created successfully");
      }
      onBack();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${isEdit ? "update" : "create"} product`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{isEdit ? "Edit Product" : "New Product"}</h1>
            <p className="text-sm text-muted-foreground">
              {isEdit ? "Update product details" : "Add a new product or service to your catalog"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onBack} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {isEdit ? "Update" : "Save"}
          </Button>
        </div>
      </div>
      <Separator />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Product Details</TabsTrigger>
          <TabsTrigger value="advanced">Advanced (Optional)</TabsTrigger>
        </TabsList>

        {/* ===== PRODUCT DETAILS TAB ===== */}
        <TabsContent value="details" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SKU</Label>
                    <div className="flex gap-2">
                      <Input
                        value={formData.sku}
                        onChange={(e) => updateField("sku", e.target.value)}
                        placeholder="PRD-XXXXXX"
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" size="icon" onClick={() => updateField("sku", generateSKU())} title="Generate SKU">
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Barcode</Label>
                    <Input
                      value={formData.barcode}
                      onChange={(e) => updateField("barcode", e.target.value)}
                      placeholder="Optional barcode"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Product name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <select
                      value={formData.category}
                      onChange={(e) => updateField("category", e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <select
                      value={formData.type}
                      onChange={(e) => updateField("type", e.target.value)}
                      className={selectClass}
                    >
                      {TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Unit</Label>
                  <select
                    value={formData.unit}
                    onChange={(e) => updateField("unit", e.target.value)}
                    className={selectClass}
                  >
                    {UNIT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Product description..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pricing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Selling Price *</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={formData.sellingPrice || ""}
                        onChange={(e) => updateField("sellingPrice", parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cost Price</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={formData.costPrice || ""}
                        onChange={(e) => updateField("costPrice", parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Margin</Label>
                    <div className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-3 text-sm font-medium">
                      {margin}%
                    </div>
                  </div>

                  {/* Price Tiers */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Price Tiers</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addPriceTier}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Tier
                      </Button>
                    </div>
                    {priceTiers.map((tier, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={tier.tierName}
                          onChange={(e) => updatePriceTier(idx, "tierName", e.target.value)}
                          placeholder="Tier name"
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          min={1}
                          value={tier.minQuantity || ""}
                          onChange={(e) => updatePriceTier(idx, "minQuantity", parseInt(e.target.value) || 1)}
                          placeholder="Min qty"
                          className="w-24"
                        />
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={tier.price || ""}
                          onChange={(e) => updatePriceTier(idx, "price", parseFloat(e.target.value) || 0)}
                          placeholder="Price"
                          className="w-28"
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removePriceTier(idx)} className="shrink-0">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tax */}
              <Card>
                <CardHeader>
                  <CardTitle>Tax</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Taxable</Label>
                    <Switch checked={formData.taxable} onCheckedChange={(v) => updateField("taxable", v)} />
                  </div>
                  {formData.taxable && (
                    <div className="space-y-2">
                      <Label>Tax Rate (%)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={formData.taxRate || ""}
                        onChange={(e) => updateField("taxRate", parseFloat(e.target.value) || 0)}
                        placeholder="e.g. 12.5"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Inventory */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Track Inventory</Label>
                <Switch checked={formData.trackInventory} onCheckedChange={(v) => updateField("trackInventory", v)} />
              </div>
              {formData.trackInventory && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Current Stock</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.currentStock || ""}
                      onChange={(e) => updateField("currentStock", parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reorder Level</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.reorderLevel || ""}
                      onChange={(e) => updateField("reorderLevel", parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reorder Quantity</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.reorderQuantity || ""}
                      onChange={(e) => updateField("reorderQuantity", parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== ADVANCED TAB ===== */}
        <TabsContent value="advanced" className="mt-6 space-y-6">
          {/* Accounting */}
          <Card>
            <CardHeader>
              <CardTitle>Accounting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Sales Account (Revenue)</Label>
                  <select
                    value={formData.salesAccountId}
                    onChange={(e) => updateField("salesAccountId", e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select account</option>
                    {revenueAccounts.map((a: any) => (
                      <option key={a.id || a._id} value={a.id || a._id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Purchase Account (Expense)</Label>
                  <select
                    value={formData.purchaseAccountId}
                    onChange={(e) => updateField("purchaseAccountId", e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select account</option>
                    {expenseAccounts.map((a: any) => (
                      <option key={a.id || a._id} value={a.id || a._id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Inventory Account (Asset)</Label>
                  <select
                    value={formData.inventoryAccountId}
                    onChange={(e) => updateField("inventoryAccountId", e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select account</option>
                    {assetAccounts.map((a: any) => (
                      <option key={a.id || a._id} value={a.id || a._id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Variants */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Variants</CardTitle>
                <Switch checked={formData.hasVariants} onCheckedChange={(v) => updateField("hasVariants", v)} />
              </div>
            </CardHeader>
            {formData.hasVariants && (
              <CardContent className="space-y-4">
                <div className="flex justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Variant
                  </Button>
                </div>
                {variants.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No variants added yet.</p>
                )}
                {variants.map((v, idx) => (
                  <div key={idx} className="border rounded-md p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Variant {idx + 1}</span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeVariant(idx)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Name</Label>
                        <Input value={v.name} onChange={(e) => updateVariant(idx, "name", e.target.value)} placeholder="e.g. Large Red" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">SKU</Label>
                        <Input value={v.sku} onChange={(e) => updateVariant(idx, "sku", e.target.value)} placeholder="Variant SKU" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Attributes</Label>
                        <Input value={v.attributes} onChange={(e) => updateVariant(idx, "attributes", e.target.value)} placeholder="Color: Red, Size: L" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Cost Price</Label>
                        <Input type="number" min={0} step={0.01} value={v.costPrice || ""} onChange={(e) => updateVariant(idx, "costPrice", parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Selling Price</Label>
                        <Input type="number" min={0} step={0.01} value={v.sellingPrice || ""} onChange={(e) => updateVariant(idx, "sellingPrice", parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Stock</Label>
                        <Input type="number" min={0} value={v.stock || ""} onChange={(e) => updateVariant(idx, "stock", parseInt(e.target.value) || 0)} />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          {/* Bundle Items (only for type=bundle) */}
          {formData.type === "bundle" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Bundle Items</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addBundleItem}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {bundleItems.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No bundle items. Add products that make up this bundle.</p>
                )}
                {bundleItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <select
                      value={item.productId}
                      onChange={(e) => updateBundleItem(idx, "productId", e.target.value)}
                      className={`${selectClass} flex-1`}
                    >
                      <option value="">Select product</option>
                      {productsList
                        .filter((p: any) => p.id !== initialData?.id)
                        .map((p: any) => (
                          <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                        ))}
                    </select>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity || ""}
                      onChange={(e) => updateBundleItem(idx, "quantity", parseInt(e.target.value) || 1)}
                      placeholder="Qty"
                      className="w-24"
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeBundleItem(idx)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Suppliers */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Suppliers</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addSupplier}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Supplier
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {suppliers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No suppliers added.</p>
              )}
              {suppliers.map((s, idx) => (
                <div key={idx} className="border rounded-md p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Supplier {idx + 1}</span>
                      {s.isPreferred && (
                        <span className="inline-flex items-center text-xs text-amber-600">
                          <Star className="h-3 w-3 mr-0.5 fill-amber-500" /> Preferred
                        </span>
                      )}
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeSupplier(idx)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Vendor</Label>
                      <select
                        value={s.vendorId}
                        onChange={(e) => updateSupplier(idx, "vendorId", e.target.value)}
                        className={selectClass}
                      >
                        <option value="">Select vendor</option>
                        {vendors.map((v: any) => (
                          <option key={v.id || v._id} value={v.id || v._id}>{v.name || v.companyName}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Supplier SKU</Label>
                      <Input value={s.supplierSku} onChange={(e) => updateSupplier(idx, "supplierSku", e.target.value)} placeholder="Vendor SKU" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Cost Price</Label>
                      <Input type="number" min={0} step={0.01} value={s.costPrice || ""} onChange={(e) => updateSupplier(idx, "costPrice", parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Lead Time (days)</Label>
                      <Input type="number" min={0} value={s.leadTime || ""} onChange={(e) => updateSupplier(idx, "leadTime", parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={s.isPreferred} onCheckedChange={(v) => updateSupplier(idx, "isPreferred", v)} />
                    <Label className="text-xs">Preferred supplier</Label>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Service Details (only for type=service) */}
          {formData.type === "service" && (
            <Card>
              <CardHeader>
                <CardTitle>Service Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Input
                      value={formData.duration}
                      onChange={(e) => updateField("duration", e.target.value)}
                      placeholder="e.g. 1 hour, 30 mins"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Service Type</Label>
                    <select
                      value={formData.serviceType}
                      onChange={(e) => updateField("serviceType", e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Select type</option>
                      {SERVICE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
