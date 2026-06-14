import { POSProduct, POSVariant } from "../types";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { X, Package } from "lucide-react";

interface VariantPickerProps {
  product: POSProduct;
  onSelect: (variant: POSVariant) => void;
  onClose: () => void;
}

export function VariantPicker({ product, onSelect, onClose }: VariantPickerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Select Variant</h3>
            <p className="text-xs text-muted-foreground">{product.name}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Variants List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {product.variants && product.variants.length > 0 ? (
            product.variants.map((variant, idx) => {
              const outOfStock = variant.stock <= 0;
              return (
                <button
                  key={`${variant.sku}-${idx}`}
                  onClick={() => !outOfStock && onSelect(variant)}
                  disabled={outOfStock}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                    outOfStock
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-accent hover:border-primary/30"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{variant.name}</p>
                    <p className="text-xs text-muted-foreground">SKU: {variant.sku}</p>
                  </div>
                  <div className="text-right ml-3">
                    <p className="text-sm font-bold text-primary">
                      {formatCurrency(variant.sellingPrice)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Stock: {variant.stock}
                    </p>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="flex flex-col items-center py-6 text-muted-foreground">
              <Package className="h-6 w-6 mb-2 opacity-50" />
              <p className="text-xs">No variants available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
