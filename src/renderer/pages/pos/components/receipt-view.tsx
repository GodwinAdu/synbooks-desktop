/**
 * POS Receipt View
 * Shows sale confirmation and handles printing to thermal receipt printers.
 * Uses a hidden iframe for printing just the receipt content.
 */

import { useRef } from "react";
import { POSSale } from "../types";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Receipt, Printer, ArrowLeft } from "lucide-react";

interface ReceiptViewProps {
  sale: POSSale;
  onNewSale: () => void;
  orgName?: string;
}

export function ReceiptView({ sale, onNewSale, orgName }: ReceiptViewProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const receiptHTML = buildReceiptHTML(sale, orgName || "SyncBooks");
    const printWindow = window.open("", "_blank", "width=300,height=600");
    if (!printWindow) return;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <div className="flex items-center justify-center h-full">
      <div ref={receiptRef} className="w-full max-w-sm bg-background border rounded-xl p-6 shadow-sm space-y-4">
        {/* Header */}
        <div className="text-center space-y-1">
          <Receipt className="h-8 w-8 mx-auto text-primary" />
          <h2 className="text-lg font-bold">Sale Complete</h2>
          <p className="text-xs text-muted-foreground font-mono">#{sale.saleNumber}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(sale.createdAt).toLocaleString()}
          </p>
        </div>

        <Separator />

        {/* Items */}
        <div className="space-y-1.5">
          {sale.lineItems.map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs">
              <span>
                {item.name} x{item.quantity}
              </span>
              <span className="font-medium">{formatCurrency(item.total)}</span>
            </div>
          ))}
        </div>

        <Separator />

        {/* Totals */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </div>
          {sale.discountAmount > 0 && (
            <div className="flex justify-between text-destructive">
              <span>Discount</span>
              <span>-{formatCurrency(sale.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatCurrency(sale.taxAmount)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm pt-1 border-t">
            <span>Total</span>
            <span>{formatCurrency(sale.totalAmount)}</span>
          </div>
        </div>

        <Separator />

        {/* Payment Info */}
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment</span>
            <span className="capitalize">{sale.paymentMethod.replace("_", " ")}</span>
          </div>
          {sale.amountTendered && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tendered</span>
              <span>{formatCurrency(sale.amountTendered)}</span>
            </div>
          )}
          {sale.changeDue && sale.changeDue > 0 && (
            <div className="flex justify-between font-medium text-green-600">
              <span>Change</span>
              <span>{formatCurrency(sale.changeDue)}</span>
            </div>
          )}
        </div>

        {sale.customerName && (
          <>
            <Separator />
            <div className="text-xs text-center text-muted-foreground">
              Customer: {sale.customerName}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1.5" />
            Print Receipt
          </Button>
          <Button className="flex-1" onClick={onNewSale}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            New Sale
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Build a standalone HTML receipt document for thermal printing.
 * Formatted for 58mm/80mm thermal paper.
 */
function buildReceiptHTML(sale: POSSale, orgName: string): string {
  const fmt = (n: number) => `GHS ${(n || 0).toFixed(2)}`;
  const date = new Date(sale.createdAt).toLocaleString("en-GH", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const itemsHTML = sale.lineItems.map((item) => `
    <tr>
      <td style="text-align:left;padding:2px 0">${item.name}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:right">${fmt(item.total)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html><html><head><title>Receipt</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 11px; width: 80mm; padding: 4mm; color: #000; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .line { border-top: 1px dashed #000; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; }
  .total-row { font-weight: bold; font-size: 13px; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
  .footer { margin-top: 8px; font-size: 9px; text-align: center; color: #555; }
  @media print { body { width: 100%; padding: 0; } @page { margin: 2mm; size: 80mm auto; } }
</style></head><body>

<div class="center bold" style="font-size:14px;margin-bottom:4px">${orgName}</div>
<div class="center" style="font-size:9px;margin-bottom:6px">${date}</div>
<div class="center" style="font-size:10px">Receipt #${sale.saleNumber}</div>
${sale.customerName ? `<div class="center" style="font-size:9px">Customer: ${sale.customerName}</div>` : ""}

<div class="line"></div>

<table>
  <thead><tr>
    <td style="text-align:left" class="bold">Item</td>
    <td style="text-align:center" class="bold">Qty</td>
    <td style="text-align:right" class="bold">Amount</td>
  </tr></thead>
  <tbody>${itemsHTML}</tbody>
</table>

<div class="line"></div>

<table>
  <tr><td>Subtotal</td><td style="text-align:right">${fmt(sale.subtotal)}</td></tr>
  ${sale.discountAmount > 0 ? `<tr><td>Discount</td><td style="text-align:right">-${fmt(sale.discountAmount)}</td></tr>` : ""}
  <tr><td>Tax</td><td style="text-align:right">${fmt(sale.taxAmount)}</td></tr>
</table>

<div class="total-row" style="display:flex;justify-content:space-between">
  <span>TOTAL</span><span>${fmt(sale.totalAmount)}</span>
</div>

<div class="line"></div>

<table style="font-size:10px">
  <tr><td>Payment</td><td style="text-align:right;text-transform:capitalize">${sale.paymentMethod.replace("_", " ")}</td></tr>
  ${sale.amountTendered ? `<tr><td>Tendered</td><td style="text-align:right">${fmt(sale.amountTendered)}</td></tr>` : ""}
  ${sale.changeDue && sale.changeDue > 0 ? `<tr><td>Change</td><td style="text-align:right">${fmt(sale.changeDue)}</td></tr>` : ""}
</table>

<div class="line"></div>

<div class="footer">
  Thank you for your purchase!<br/>
  Powered by SyncBooks
</div>

</body></html>`;
}
