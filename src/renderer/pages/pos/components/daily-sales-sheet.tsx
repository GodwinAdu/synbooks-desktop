/**
 * Daily Sales Sheet
 * Shows today's sales breakdown by payment method, transaction count, and totals.
 * Matches the Next.js DailySalesSheet drawer component.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Banknote, CreditCard, Smartphone, Building2, Receipt, TrendingUp, Hash } from "lucide-react";

interface SalesSummary {
  totalSales: number;
  totalTransactions: number;
  byMethod: { method: string; count: number; total: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
}

const methodIcons: Record<string, any> = {
  cash: Banknote,
  card: CreditCard,
  mobile_money: Smartphone,
  bank_transfer: Building2,
  split: Receipt,
};

const methodLabels: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  mobile_money: "Mobile Money",
  bank_transfer: "Bank Transfer",
  split: "Split Payment",
};

export function DailySalesSheet() {
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const salesData: any = await api.get("/pos/sales", { pageSize: 500 });
      const sales = salesData?.data || salesData || [];

      // Filter today's sales
      const today = new Date().toISOString().split("T")[0];
      const todaySales = sales.filter((s: any) => s.createdAt?.startsWith(today));

      // Calculate totals
      const totalSales = todaySales.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0);
      const totalTransactions = todaySales.length;

      // Group by payment method
      const methodMap: Record<string, { count: number; total: number }> = {};
      for (const sale of todaySales) {
        const method = sale.paymentMethod || "cash";
        if (!methodMap[method]) methodMap[method] = { count: 0, total: 0 };
        methodMap[method].count++;
        methodMap[method].total += sale.totalAmount || 0;
      }
      const byMethod = Object.entries(methodMap).map(([method, data]) => ({ method, ...data }));

      // Top products (from line items)
      const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};
      for (const sale of todaySales) {
        for (const item of sale.lineItems || []) {
          const key = item.name || item.productId;
          if (!productMap[key]) productMap[key] = { name: item.name || "Unknown", qty: 0, revenue: 0 };
          productMap[key].qty += item.quantity || 0;
          productMap[key].revenue += item.total || (item.quantity * item.unitPrice) || 0;
        }
      }
      const topProducts = Object.values(productMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setSummary({ totalSales, totalTransactions, byMethod, topProducts });
    } catch {
      setSummary({ totalSales: 0, totalTransactions: 0, byMethod: [], topProducts: [] });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Today's Revenue</p>
                <p className="text-xl font-bold">{formatCurrency(summary.totalSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Hash className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="text-xl font-bold">{summary.totalTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.byMethod.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No sales today</p>
          ) : (
            <div className="space-y-3">
              {summary.byMethod.map((entry) => {
                const Icon = methodIcons[entry.method] || Receipt;
                const label = methodLabels[entry.method] || entry.method;
                const percent = summary.totalSales > 0 ? ((entry.total / summary.totalSales) * 100).toFixed(0) : "0";
                return (
                  <div key={entry.method} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium capitalize">{label}</p>
                        <p className="text-[10px] text-muted-foreground">{entry.count} transaction{entry.count !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatCurrency(entry.total)}</p>
                      <Badge variant="secondary" className="text-[10px]">{percent}%</Badge>
                    </div>
                  </div>
                );
              })}
              <Separator />
              <div className="flex items-center justify-between font-bold">
                <span className="text-sm">Total</span>
                <span className="text-sm">{formatCurrency(summary.totalSales)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Products */}
      {summary.topProducts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Top Products Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.topProducts.map((product, idx) => (
                <div key={product.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}.</span>
                    <span className="text-sm truncate max-w-[180px]">{product.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">{product.qty} sold</span>
                    <span className="text-sm font-medium ml-3">{formatCurrency(product.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
