import { useState } from "react";
import { CartItem, SplitPayment } from "../types";
import { formatCurrency, cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Banknote, CreditCard, Smartphone, Building2, X, Loader2, Plus, Trash2, StickyNote, ArrowRightLeft,
} from "lucide-react";

interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  customerName: string;
  notes: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  onSaleComplete: (sale: any) => void;
}

const paymentMethods = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "mobile_money", label: "Mobile Money", icon: Smartphone },
  { id: "bank_transfer", label: "Bank Transfer", icon: Building2 },
];

export function CheckoutDialog({
  open,
  onClose,
  items,
  customerName,
  notes,
  subtotal,
  discountAmount,
  taxAmount,
  totalAmount,
  onSaleComplete,
}: CheckoutDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [amountTendered, setAmountTendered] = useState<string>("");
  const [processing, setProcessing] = useState(false);

  // Split payment state
  const [splitMode, setSplitMode] = useState(false);
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([
    { method: "cash", amount: 0 },
  ]);

  const tenderedNum = parseFloat(amountTendered) || 0;
  const changeDue = paymentMethod === "cash" ? Math.max(0, tenderedNum - totalAmount) : 0;

  // Split payment helpers
  const splitTotal = splitPayments.reduce((sum, sp) => sum + sp.amount, 0);
  const splitRemaining = totalAmount - splitTotal;

  const addSplitEntry = () => {
    setSplitPayments((prev) => [...prev, { method: "cash", amount: 0 }]);
  };

  const removeSplitEntry = (index: number) => {
    setSplitPayments((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSplitMethod = (index: number, method: string) => {
    setSplitPayments((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, method } : entry))
    );
  };

  const updateSplitAmount = (index: number, value: string) => {
    setSplitPayments((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, amount: Number(value) || 0 } : entry))
    );
  };

  // Determine if we can complete
  const canComplete = (() => {
    if (splitMode) {
      return splitTotal >= totalAmount;
    }
    if (paymentMethod === "cash") {
      return tenderedNum >= totalAmount;
    }
    return true;
  })();

  const handleCompleteSale = async () => {
    if (!canComplete) return;

    setProcessing(true);
    try {
      const payload: any = {
        customerName: customerName || undefined,
        lineItems: items,
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        notes: notes || undefined,
      };

      if (splitMode) {
        payload.paymentMethod = "split";
        payload.splitPayments = splitPayments.filter((sp) => sp.amount > 0);
      } else {
        payload.paymentMethod = paymentMethod;
        if (paymentMethod === "cash") {
          payload.amountTendered = tenderedNum;
          payload.changeDue = changeDue;
        }
      }

      const result = await api.post("/pos/sales", payload);
      toast.success("Sale completed successfully!");
      const saleData = result.data || result;
      onSaleComplete(saleData);

      // Reset state
      setSplitMode(false);
      setSplitPayments([{ method: "cash", amount: 0 }]);
      setAmountTendered("");
      setPaymentMethod("cash");
    } catch (error: any) {
      // Offline fallback: queue the sale for later sync
      const OFFLINE_QUEUE_KEY = "pos-offline-queue";
      try {
        const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
        queue.push(payload);
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        toast.warning("Sale queued offline — will sync when connection is restored");
        // Still complete the flow for the user
        const offlineSale = { ...payload, id: `offline-${Date.now()}`, saleNumber: `POS-OFFLINE-${Date.now()}`, status: "completed", createdAt: new Date().toISOString() };
        onSaleComplete(offlineSale as any);
      } catch {
        toast.error(error.message || "Failed to process sale");
      }
    } finally {
      setProcessing(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-background rounded-xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Complete Payment</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Total */}
        <div className="text-center py-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">Total Amount</p>
          <p className="text-3xl font-bold">{formatCurrency(totalAmount)}</p>
        </div>

        {/* Notes Display */}
        {notes && (
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <StickyNote className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">{notes}</p>
          </div>
        )}

        {/* Split Payment Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            <Label className="text-xs font-medium">Split Payment</Label>
          </div>
          <Switch
            checked={splitMode}
            onCheckedChange={setSplitMode}
          />
        </div>

        {/* Payment Section */}
        {splitMode ? (
          /* Split Payment Mode */
          <div className="space-y-3">
            <Label className="text-xs font-medium">Payment Methods</Label>
            {splitPayments.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <select
                  value={entry.method}
                  onChange={(e) => updateSplitMethod(index, e.target.value)}
                  className="h-9 px-2 rounded-md border border-input bg-background text-xs w-32 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {paymentMethods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={entry.amount || ""}
                  onChange={(e) => updateSplitAmount(index, e.target.value)}
                  className="flex-1 h-9 text-xs"
                />
                {splitPayments.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeSplitEntry(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={addSplitEntry}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Payment Method
            </Button>

            {/* Split Summary */}
            <div className="p-3 bg-muted rounded-lg space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Paid</span>
                <span className="font-medium">{formatCurrency(splitTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Remaining</span>
                <span className={cn("font-medium", splitRemaining > 0 ? "text-destructive" : "text-green-600")}>
                  {splitRemaining > 0
                    ? formatCurrency(splitRemaining)
                    : splitRemaining < 0
                    ? `+${formatCurrency(Math.abs(splitRemaining))} change`
                    : "Fully covered"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Single Payment Mode */
          <>
            {/* Payment Method Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Payment Method</Label>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all",
                      paymentMethod === method.id
                        ? "border-primary bg-primary/5 text-primary"
                        : "hover:bg-accent"
                    )}
                  >
                    <method.icon className="h-4 w-4" />
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Amount Tendered */}
            {paymentMethod === "cash" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Amount Tendered</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    className="text-lg font-semibold h-11"
                    autoFocus
                  />
                </div>
                {tenderedNum > 0 && tenderedNum >= totalAmount && (
                  <div className="flex justify-between items-center bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                    <span className="text-sm text-green-700 dark:text-green-400">Change Due</span>
                    <span className="text-lg font-bold text-green-700 dark:text-green-400">
                      {formatCurrency(changeDue)}
                    </span>
                  </div>
                )}
                {tenderedNum > 0 && tenderedNum < totalAmount && (
                  <p className="text-xs text-destructive">
                    Insufficient amount. Need {formatCurrency(totalAmount - tenderedNum)} more.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Complete Button */}
        <Button
          className="w-full h-12 text-base font-semibold"
          disabled={!canComplete || processing}
          onClick={handleCompleteSale}
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            "Complete Sale"
          )}
        </Button>
      </div>
    </div>
  );
}
