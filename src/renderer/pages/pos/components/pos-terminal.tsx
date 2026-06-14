import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api-client";
import { POSProduct, POSVariant, CartItem, POSSale } from "../types";
import { ProductGrid } from "./product-grid";
import { CartPanel } from "./cart-panel";
import { CheckoutDialog } from "./checkout-dialog";
import { ReceiptView } from "./receipt-view";
import { VariantPicker } from "./variant-picker";
import { HeldOrdersPanel, HeldOrder, getHeldOrders, saveHeldOrders } from "./held-orders";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Search, RefreshCw, ScanBarcode, PauseCircle } from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "../store/cart-store";

export function POSTerminal({ onSaleCompleted, sessionActive, sessionCashier, onOpenSession }: { onSaleCompleted?: (amount: number) => void; sessionActive?: boolean; sessionCashier?: string; onOpenSession?: () => void }) {
  const [products, setProducts] = useState<POSProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  // Cart state from Zustand (persisted to localStorage)
  const cart = useCartStore((s) => s.items);
  const setCart = (updater: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
    if (typeof updater === "function") {
      const newItems = updater(useCartStore.getState().items);
      useCartStore.setState({ items: newItems });
    } else {
      useCartStore.setState({ items: updater });
    }
  };
  const customerName = useCartStore((s) => s.customerName);
  const setCustomerName = useCartStore((s) => s.setCustomerName);
  const notes = useCartStore((s) => s.notes);
  const setNotes = useCartStore((s) => s.setNotes);
  const discountPercent = useCartStore((s) => s.discountPercent);
  const setDiscountPercent = useCartStore((s) => s.setDiscountPercent);
  const clearCartStore = useCartStore((s) => s.clearCart);
  const replaceCartStore = useCartStore((s) => s.replaceCart);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<POSSale | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [variantPickerProduct, setVariantPickerProduct] = useState<POSProduct | null>(null);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(getHeldOrders());
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Load products (paginated, with search/category filtering on server)
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadProducts = useCallback(async (page = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      const params: Record<string, any> = { page, pageSize: 60 };
      if (searchQuery) params.search = searchQuery;
      if (activeCategory !== "all") params.category = activeCategory;

      const data: any = await api.get("/pos/products", params);
      const newProducts = data?.data || data || [];

      if (append) {
        setProducts((prev) => [...prev, ...newProducts]);
      } else {
        setProducts(newProducts);
      }
      setTotalProducts(data?.total || newProducts.length);
      setHasMore(data?.hasMore || false);
      setCurrentPage(page);
    } catch {
      if (!append) setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeCategory]);

  // Initial load
  useEffect(() => {
    loadProducts(1);
  }, [activeCategory]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      loadProducts(1);
    }, 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery]);

  const loadMore = () => {
    if (hasMore) loadProducts(currentPage + 1, true);
  };

  // Keyboard shortcuts (matching Next.js POS)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+B → Focus barcode input
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        barcodeRef.current?.focus();
      }
      // Ctrl+P or F12 → Open checkout (if cart has items)
      if (((e.ctrlKey || e.metaKey) && e.key === "p") || e.key === "F12") {
        e.preventDefault();
        if (cart.length > 0) setCheckoutOpen(true);
      }
      // Escape → Close modals or clear search
      if (e.key === "Escape") {
        if (checkoutOpen) setCheckoutOpen(false);
        else if (variantPickerProduct) setVariantPickerProduct(null);
        else if (searchQuery) setSearchQuery("");
        else if (barcodeInput) setBarcodeInput("");
      }
      // Ctrl+Delete → Clear cart
      if ((e.ctrlKey || e.metaKey) && e.key === "Delete") {
        e.preventDefault();
        clearCart();
      }
      // F5 → Refresh products
      if (e.key === "F5") {
        e.preventDefault();
        loadProducts(1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, checkoutOpen, variantPickerProduct, searchQuery, barcodeInput]);

  // Get unique categories
  const categories = Array.from(
    new Set(products.map((p) => p.categoryName).filter(Boolean))
  ) as string[];

  // Helper: get applicable price tier for a product/variant given quantity
  const getApplicableTier = (
    priceTiers: { name: string; minQty: number; price: number }[] | undefined,
    qty: number
  ) => {
    if (!priceTiers || priceTiers.length === 0) return null;
    // Sort descending by minQty, find the first one where qty >= minQty
    const sorted = [...priceTiers].sort((a, b) => b.minQty - a.minQty);
    return sorted.find((tier) => qty >= tier.minQty) || null;
  };

  // Helper: recalculate cart item totals
  const recalcItem = (item: CartItem): CartItem => {
    const effectivePrice = item.unitPrice;
    const itemTotal = item.quantity * effectivePrice * (1 - item.discount / 100);
    const itemTax = item.quantity * effectivePrice * (1 - item.discount / 100) * (item.taxRate / 100);
    return { ...item, total: itemTotal, taxAmount: itemTax };
  };

  // Cart calculations (with per-item discounts)
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const taxAmount = cart.reduce((sum, item) => sum + item.taxAmount, 0);
  const totalAmount = subtotal - discountAmount + taxAmount;

  // Low stock warning check
  const checkLowStock = (product: POSProduct, cartQty: number) => {
    if (!product.trackInventory) return;
    const remaining = product.currentStock - cartQty;
    if (remaining <= 5 && remaining >= 0) {
      toast.warning(`Low stock warning: "${product.name}" — only ${remaining} left after this sale.`, {
        duration: 4000,
      });
    }
  };

  // Add to cart (handles variants, price tiers, low stock)
  const addToCart = (product: POSProduct) => {
    // If product has variants, show variant picker
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      setVariantPickerProduct(product);
      return;
    }

    addProductToCart(product);
  };

  const addProductToCart = (product: POSProduct, variant?: POSVariant) => {
    const itemId = variant ? `${product.id}__${variant.sku}` : product.id;
    const price = variant ? variant.sellingPrice : product.sellingPrice;
    const sku = variant ? variant.sku : product.sku;
    const name = variant ? `${product.name} — ${variant.name}` : product.name;
    const taxRate = product.taxable ? (product.taxRate || 0) : 0;
    const tiers = variant?.priceTiers || product.priceTiers;

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === itemId);
      if (existing) {
        const newQty = existing.quantity + 1;
        const tier = getApplicableTier(tiers, newQty);
        const unitPrice = tier ? tier.price : price;
        const updated = prev.map((item) =>
          item.productId === itemId
            ? recalcItem({
                ...item,
                quantity: newQty,
                unitPrice,
                appliedTier: tier?.name,
              })
            : item
        );
        // Low stock check
        checkLowStock(product, newQty);
        return updated;
      }

      const tier = getApplicableTier(tiers, 1);
      const unitPrice = tier ? tier.price : price;
      const newItem: CartItem = {
        productId: itemId,
        variantSku: variant?.sku,
        variantName: variant?.name,
        name,
        sku,
        quantity: 1,
        unitPrice,
        discount: 0,
        taxRate,
        taxAmount: unitPrice * (taxRate / 100),
        total: unitPrice,
        appliedTier: tier?.name,
      };

      // Low stock check
      checkLowStock(product, 1);

      return [...prev, recalcItem(newItem)];
    });
  };

  // Handle variant selection
  const handleVariantSelect = (variant: POSVariant) => {
    if (variantPickerProduct) {
      addProductToCart(variantPickerProduct, variant);
      setVariantPickerProduct(null);
    }
  };

  // Update quantity (with price tier re-check)
  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;

          // Find the product to check price tiers
          const baseProductId = productId.includes("__") ? productId.split("__")[0] : productId;
          const product = products.find((p) => p.id === baseProductId);
          let tiers = product?.priceTiers;

          // If it's a variant, check variant tiers
          if (item.variantSku && product?.variants) {
            const variant = product.variants.find((v) => v.sku === item.variantSku);
            if (variant?.priceTiers) tiers = variant.priceTiers;
          }

          const tier = getApplicableTier(tiers, newQty);
          const basePrice = (() => {
            if (item.variantSku && product?.variants) {
              const v = product.variants.find((vr) => vr.sku === item.variantSku);
              return v ? v.sellingPrice : product?.sellingPrice || item.unitPrice;
            }
            return product?.sellingPrice || item.unitPrice;
          })();

          const unitPrice = tier ? tier.price : basePrice;

          // Low stock warning
          if (delta > 0 && product) {
            checkLowStock(product, newQty);
          }

          return recalcItem({
            ...item,
            quantity: newQty,
            unitPrice,
            appliedTier: tier?.name,
          });
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Update item discount
  const updateItemDiscount = (productId: string, discount: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? recalcItem({ ...item, discount: Math.min(100, Math.max(0, discount)) })
          : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    clearCartStore();
  };

  // Hold current order
  const holdOrder = () => {
    if (cart.length === 0) return;
    const held: HeldOrder = {
      id: `hold-${Date.now()}`,
      customerName,
      items: [...cart],
      subtotal,
      heldAt: new Date().toISOString(),
      notes: notes || undefined,
    };
    const updated = [...heldOrders, held];
    setHeldOrders(updated);
    saveHeldOrders(updated);
    clearCart();
    toast.success("Order held — you can recall it later");
  };

  // Recall a held order
  const recallOrder = (order: HeldOrder) => {
    replaceCartStore(order.items, order.customerName, order.notes);
    // Remove from held
    const updated = heldOrders.filter(o => o.id !== order.id);
    setHeldOrders(updated);
    saveHeldOrders(updated);
    setShowHeldOrders(false);
    toast.success("Order recalled to cart");
  };

  // Delete a held order
  const deleteHeldOrder = (orderId: string) => {
    const updated = heldOrders.filter(o => o.id !== orderId);
    setHeldOrders(updated);
    saveHeldOrders(updated);
    toast.success("Held order removed");
  };

  // Barcode scan handler
  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && barcodeInput.trim()) {
      const barcode = barcodeInput.trim();
      const product = products.find(
        (p) => p.barcode?.toLowerCase() === barcode.toLowerCase()
      );
      if (product) {
        addToCart(product);
        toast.success(`Added: ${product.name}`);
      } else {
        toast.error("Product not found", {
          description: `No product matching barcode "${barcode}"`,
        });
      }
      setBarcodeInput("");
    }
  };

  const handleSaleComplete = (sale: POSSale) => {
    setCheckoutOpen(false);
    setCompletedSale(sale);
    clearCartStore();
    loadProducts(1);
    // Notify parent (session tracking)
    onSaleCompleted?.(sale.totalAmount || totalAmount);
  };

  const handleNewSale = () => {
    setCompletedSale(null);
  };

  // If a sale was just completed, show receipt
  if (completedSale) {
    return (
      <div className="h-[calc(100vh-120px)]">
        <ReceiptView sale={completedSale} onNewSale={handleNewSale} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-120px)] flex">
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-9 w-full max-w-md" />
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
        <div className="w-80 border-l p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      </div>
    );
  }

  // Session required overlay
  if (!sessionActive) {
    return (
      <div className="h-[calc(100vh-120px)] flex items-center justify-center bg-muted/30">
        <div className="text-center max-w-sm space-y-4 p-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <PauseCircle className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold">Session Required</h2>
          <p className="text-sm text-muted-foreground">
            You need to open a POS session before you can process sales. This helps track cash and reconcile at end of day.
          </p>
          <Button onClick={onOpenSession} size="lg" className="w-full">
            Open Session
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex">
      {/* Left Side — Products */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Barcode & Search Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          {/* Barcode Input */}
          <div className="relative w-48">
            <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={barcodeRef}
              placeholder="Scan barcode..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={handleBarcodeScan}
              className="pl-9 h-9"
              autoFocus
            />
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products (name, SKU)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => loadProducts(1)} title="Refresh products">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {/* Held Orders Button */}
          {heldOrders.length > 0 && (
            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setShowHeldOrders(!showHeldOrders)}>
              <PauseCircle className="h-3.5 w-3.5 text-amber-600" />
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{heldOrders.length}</Badge>
            </Button>
          )}
        </div>

        {/* Category Pills */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 border-b overflow-x-auto">
            <button
              onClick={() => setActiveCategory("all")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-accent"
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-accent"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Held Orders Panel (if visible) */}
        {showHeldOrders && heldOrders.length > 0 && (
          <div className="px-4 py-3 border-b bg-amber-50/50 dark:bg-amber-950/10 max-h-48 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Held Orders ({heldOrders.length})</span>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowHeldOrders(false)}>Close</Button>
            </div>
            <HeldOrdersPanel orders={heldOrders} onRecall={recallOrder} onDelete={deleteHeldOrder} />
          </div>
        )}

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <ProductGrid
            products={products}
            searchQuery={searchQuery}
            activeCategory={activeCategory}
            cart={cart}
            onAddToCart={addToCart}
            hasMore={hasMore}
            onLoadMore={loadMore}
            total={totalProducts}
          />
        </div>
      </div>

      {/* Right Side — Cart */}
      <div className="w-96 flex-shrink-0">
        <CartPanel
          items={cart}
          customerName={customerName}
          notes={notes}
          discountPercent={discountPercent}
          onUpdateQuantity={updateQuantity}
          onUpdateItemDiscount={updateItemDiscount}
          onRemoveItem={removeItem}
          onClearCart={clearCart}
          onHoldOrder={holdOrder}
          onCustomerNameChange={setCustomerName}
          onNotesChange={setNotes}
          onDiscountChange={setDiscountPercent}
          onCheckout={() => setCheckoutOpen(true)}
          subtotal={subtotal}
          discountAmount={discountAmount}
          taxAmount={taxAmount}
          totalAmount={totalAmount}
        />
      </div>

      {/* Variant Picker */}
      {variantPickerProduct && (
        <VariantPicker
          product={variantPickerProduct}
          onSelect={handleVariantSelect}
          onClose={() => setVariantPickerProduct(null)}
        />
      )}

      {/* Checkout Dialog */}
      <CheckoutDialog
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        items={cart}
        customerName={customerName}
        notes={notes}
        subtotal={subtotal}
        discountAmount={discountAmount}
        taxAmount={taxAmount}
        totalAmount={totalAmount}
        onSaleComplete={handleSaleComplete}
      />
    </div>
  );
}
