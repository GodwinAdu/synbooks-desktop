/**
 * Cart Panel - Right side of POS terminal
 * Clean, spacious design with clear visual hierarchy.
 */

import { CartItem } from "../types";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, X, ShoppingCart, Trash2, Percent, AlertTriangle, PauseCircle } from "lucide-react";
import { CustomerSearch } from "./customer-search";

interface CartPanelProps {
  items: CartItem[];
  customerName: string;
  notes: string;
  discountPercent: number;
  maxDiscountPct?: number;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onUpdateItemDiscount: (productId: string, discount: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onHoldOrder: () => void;
  onCustomerNameChange: (name: string) => void;
  onNotesChange: (notes: string) => void;
  onDiscountChange: (percent: number) => void;
  onCheckout: () => void;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
}

export function CartPanel({
  items,
  customerName,
  notes,
  discountPercent,
  maxDiscountPct = 20,
  onUpdateQuantity,
  onUpdateItemDiscount,
  onRemoveItem,
  onClearCart,
  onHoldOrder,
  onCustomerNameChange,
  onNotesChange,
  onDiscountChange,
  onCheckout,
  subtotal,
  discountAmount,
  taxAmount,
  totalAmount,
}: CartPanelProps) {
  const exceedsMaxDiscount = discountPercent > maxDiscountPct;
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="flex flex-col h-full border-l bg-card/50">
      {/* Cart Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShoppingCart className="h-4 w-4 text-primary" />
          </div>
          <div>
            <span className="font-semibold text-sm">Cart</span>
            {itemCount > 0 && (
              <span className="ml-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full px-2 py-0.5">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            )}
          </div>
        </div>
        {items.length > 0 && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-amber-600 h-7 px-2 text-xs hover:bg-amber-50" onClick={onHoldOrder}>
              <PauseCircle className="h-3.5 w-3.5 mr-1" /> Hold
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive h-7 px-2 text-xs hover:bg-red-50" onClick={onClearCart}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Customer & Notes */}
      <div className="px-4 py-3 border-b space-y-2">
        <CustomerSearch value={customerName} onChange={onCustomerNameChange} />
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <ShoppingCart className="h-7 w-7 opacity-30" />
            </div>
            <p className="text-sm font-medium">Cart is empty</p>
            <p className="text-xs mt-1">Click products to add them here</p>
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <div key={item.productId} className="group rounded-lg border bg-card p-3 hover:border-border/80 transition-colors">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-tight">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{formatCurrency(item.unitPrice)}</span>
                      {item.appliedTier && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">{item.appliedTier}</Badge>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-primary shrink-0">
                    {formatCurrency(item.total)}
                  </span>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-md hover:bg-background"
                      onClick={() => onUpdateQuantity(item.productId, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm font-bold w-8 text-center">{item.quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-md hover:bg-background"
                      onClick={() => onUpdateQuantity(item.productId, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Item discount */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Percent className="h-3 w-3 text-muted-foreground" />
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={item.discount || ""}
                        onChange={(e) => onUpdateItemDiscount(item.productId, Number(e.target.value) || 0)}
                        className="h-6 w-10 text-[10px] text-right px-1"
                        placeholder="0"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-red-50"
                      onClick={() => onRemoveItem(item.productId)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totals & Checkout */}
      {items.length > 0 && (
        <div className="border-t bg-card px-4 py-4 space-y-3">
          {/* Order Discount */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Discount</span>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={0}
                max={100}
                value={discountPercent || ""}
                onChange={(e) => onDiscountChange(Number(e.target.value) || 0)}
                className={cn("h-7 w-14 text-xs text-right", exceedsMaxDiscount && "border-amber-500")}
                placeholder="0"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
          {exceedsMaxDiscount && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-amber-50 border border-amber-200">
              <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
              <span className="text-[10px] text-amber-700">Exceeds max {maxDiscountPct}%</span>
            </div>
          )}

          {/* Summary */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount ({discountPercent}%)</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          {/* Checkout Button */}
          <Button
            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 shadow-md"
            onClick={onCheckout}
          >
            Charge {formatCurrency(totalAmount)}
          </Button>
        </div>
      )}
    </div>
  );
}
