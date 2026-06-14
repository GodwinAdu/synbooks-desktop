/**
 * Product Grid - Clickable product cards for the POS terminal
 * Clean, modern design with proper spacing and visual hierarchy.
 */

import { POSProduct, CartItem } from "../types";
import { formatCurrency, cn } from "@/lib/utils";
import { Package, ShoppingCart } from "lucide-react";

interface ProductGridProps {
  products: POSProduct[];
  searchQuery: string;
  activeCategory: string;
  cart: CartItem[];
  onAddToCart: (product: POSProduct) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  total?: number;
}

export function ProductGrid({ products, searchQuery, activeCategory, cart, onAddToCart, hasMore, onLoadMore, total }: ProductGridProps) {
  // Filtering is now done server-side, just render what we have
  const filtered = products;

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Package className="h-12 w-12 mb-3 opacity-30" />
        <p className="text-sm font-medium">No products found</p>
        <p className="text-xs">Try adjusting your search or category filter.</p>
      </div>
    );
  }

  const getCartQty = (productId: string): number => {
    return cart
      .filter(item => item.productId === productId || item.productId.startsWith(`${productId}__`))
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {filtered.map((product) => {
          const outOfStock = product.trackInventory && product.currentStock <= 0;
          const lowStock = product.trackInventory && product.currentStock > 0 && product.currentStock <= 5;
          const cartQty = getCartQty(product.id);

          return (
            <button
              key={product.id}
              onClick={() => !outOfStock && onAddToCart(product)}
              disabled={outOfStock}
              className={cn(
                "group relative flex flex-col rounded-xl border bg-card text-left transition-all duration-150 overflow-hidden",
                "hover:shadow-md hover:border-primary/40 hover:scale-[1.02] active:scale-[0.98]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                outOfStock && "opacity-40 cursor-not-allowed hover:scale-100 hover:shadow-none hover:border-border",
                cartQty > 0 && !outOfStock && "border-primary/50 shadow-sm bg-primary/5"
              )}
            >
              {/* Product Image / Placeholder */}
              <div className="w-full aspect-square bg-gradient-to-br from-muted/80 to-muted flex items-center justify-center overflow-hidden">
                {product.primaryImage ? (
                  <img
                    src={product.primaryImage}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <Package className="h-10 w-10 text-muted-foreground/20" />
                )}
              </div>

              {/* Content */}
              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-sm font-medium line-clamp-2 leading-tight">{product.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{product.sku}</p>
                </div>
                <div className="flex items-end justify-between mt-2">
                  <span className="text-base font-bold text-primary">
                    {formatCurrency(product.sellingPrice)}
                  </span>
                  {product.trackInventory && (
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full",
                      outOfStock ? "bg-red-100 text-red-700" :
                      lowStock ? "bg-amber-100 text-amber-700" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {outOfStock ? "Out" : `${product.currentStock}`}
                    </span>
                  )}
                </div>
              </div>

              {/* Cart quantity badge */}
              {cartQty > 0 && !outOfStock && (
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full min-w-[24px] h-6 flex items-center justify-center px-1.5 shadow-sm">
                  {cartQty}
                </div>
              )}

              {/* Variant indicator */}
              {product.hasVariants && product.variants && product.variants.length > 0 && (
                <div className="absolute top-2 left-2 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-medium shadow-sm">
                  {product.variants.length} options
                </div>
              )}

              {/* Out of Stock overlay */}
              {outOfStock && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <span className="text-xs bg-red-600 text-white px-3 py-1 rounded-full font-medium">
                    Out of Stock
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Load More / Product count */}
      <div className="flex items-center justify-center pt-4 pb-2">
        {hasMore && onLoadMore ? (
          <button
            onClick={onLoadMore}
            className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            Load more products ({filtered.length} of {total || "?"})
          </button>
        ) : filtered.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} product{filtered.length !== 1 ? "s" : ""}
          </p>
        ) : null}
      </div>
    </div>
  );
}
