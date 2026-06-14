/**
 * Held Orders Panel
 * Shows parked/held orders that can be recalled to the active cart.
 * Stored in localStorage for persistence.
 */

import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PauseCircle, PlayCircle, Trash2, ShoppingCart } from "lucide-react";
import type { CartItem } from "../types";

export interface HeldOrder {
  id: string;
  customerName: string;
  items: CartItem[];
  subtotal: number;
  heldAt: string;
  notes?: string;
}

const HELD_ORDERS_KEY = "pos-held-orders";

export function getHeldOrders(): HeldOrder[] {
  try { return JSON.parse(localStorage.getItem(HELD_ORDERS_KEY) || "[]"); }
  catch { return []; }
}

export function saveHeldOrders(orders: HeldOrder[]): void {
  localStorage.setItem(HELD_ORDERS_KEY, JSON.stringify(orders));
}

interface HeldOrdersPanelProps {
  onRecall: (order: HeldOrder) => void;
  onDelete: (orderId: string) => void;
  orders: HeldOrder[];
}

export function HeldOrdersPanel({ orders, onRecall, onDelete }: HeldOrdersPanelProps) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <PauseCircle className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-xs font-medium">No held orders</p>
        <p className="text-[10px]">Use the "Hold" button to park the current cart</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {orders.map((order) => (
        <div key={order.id} className="border rounded-lg p-3 space-y-2 hover:bg-accent/50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">{order.customerName || "Walk-in"}</span>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {order.items.reduce((sum, i) => sum + i.quantity, 0)} items
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              Held at {new Date(order.heldAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="text-xs font-bold">{formatCurrency(order.subtotal)}</span>
          </div>

          {/* Items preview */}
          <div className="text-[10px] text-muted-foreground truncate">
            {order.items.map(i => i.name).join(", ")}
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => onRecall(order)}>
              <PlayCircle className="h-3 w-3 mr-1" /> Recall
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => onDelete(order.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
