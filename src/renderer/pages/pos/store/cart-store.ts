/**
 * POS Cart Store (Zustand + localStorage persistence)
 * Persists cart state so items survive page refresh, navigation, and app restart.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartItem } from "../types";

interface CartState {
  items: CartItem[];
  customerName: string;
  notes: string;
  discountPercent: number;

  // Actions
  addItem: (item: CartItem) => void;
  updateItem: (productId: string, updates: Partial<CartItem>) => void;
  updateQuantity: (productId: string, delta: number) => void;
  removeItem: (productId: string) => void;
  setCustomerName: (name: string) => void;
  setNotes: (notes: string) => void;
  setDiscountPercent: (percent: number) => void;
  clearCart: () => void;
  replaceCart: (items: CartItem[], customerName?: string, notes?: string) => void;

  // Computed (call these as functions)
  getSubtotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      customerName: "",
      notes: "",
      discountPercent: 0,

      addItem: (item) => {
        const { items } = get();
        const existing = items.find((i) => i.productId === item.productId);
        if (existing) {
          set({
            items: items.map((i) =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice * (1 - i.discount / 100), taxAmount: (i.quantity + 1) * i.unitPrice * (1 - i.discount / 100) * (i.taxRate / 100) }
                : i
            ),
          });
        } else {
          set({ items: [...items, item] });
        }
      },

      updateItem: (productId, updates) => {
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, ...updates } : i
          ),
        });
      },

      updateQuantity: (productId, delta) => {
        const { items } = get();
        const updated = items
          .map((i) => {
            if (i.productId !== productId) return i;
            const newQty = i.quantity + delta;
            if (newQty <= 0) return null;
            const total = newQty * i.unitPrice * (1 - i.discount / 100);
            const taxAmount = total * (i.taxRate / 100);
            return { ...i, quantity: newQty, total, taxAmount };
          })
          .filter(Boolean) as CartItem[];
        set({ items: updated });
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.productId !== productId) });
      },

      setCustomerName: (name) => set({ customerName: name }),
      setNotes: (notes) => set({ notes }),
      setDiscountPercent: (percent) => set({ discountPercent: percent }),

      clearCart: () => set({ items: [], customerName: "", notes: "", discountPercent: 0 }),

      replaceCart: (items, customerName, notes) => set({
        items,
        customerName: customerName || "",
        notes: notes || "",
      }),

      getSubtotal: () => get().items.reduce((sum, i) => sum + i.total, 0),
      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "pos-cart-storage",
      // Only persist essential fields (not computed)
      partialize: (state) => ({
        items: state.items,
        customerName: state.customerName,
        notes: state.notes,
        discountPercent: state.discountPercent,
      }),
    }
  )
);
