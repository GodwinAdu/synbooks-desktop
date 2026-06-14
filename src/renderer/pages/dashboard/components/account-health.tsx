/**
 * Account Health - Assets, Liabilities, Equity with progress bars
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Props {
  accountHealth: { totalAssets: number; totalLiabilities: number; equity: number };
}

export function AccountHealth({ accountHealth }: Props) {
  const total = accountHealth.totalAssets + accountHealth.totalLiabilities;
  const assetsPercent = total > 0 ? Math.min(100, (accountHealth.totalAssets / total) * 100) : 0;
  const liabilitiesPercent = total > 0 ? Math.min(100, (accountHealth.totalLiabilities / total) * 100) : 0;
  const equityPercent = accountHealth.totalAssets > 0
    ? Math.min(100, Math.max(0, (accountHealth.equity / accountHealth.totalAssets) * 100))
    : 0;

  const items = [
    { label: "Total Assets", sublabel: "Current asset value", value: formatCurrency(accountHealth.totalAssets), percent: assetsPercent, icon: Activity, iconBg: "bg-emerald-100", iconColor: "text-emerald-600", barColor: "bg-emerald-500" },
    { label: "Total Liabilities", sublabel: "Outstanding obligations", value: formatCurrency(accountHealth.totalLiabilities), percent: liabilitiesPercent, icon: TrendingDown, iconBg: "bg-orange-100", iconColor: "text-orange-600", barColor: "bg-orange-500" },
    { label: "Equity", sublabel: "Net worth percentage", value: `${equityPercent.toFixed(1)}%`, percent: equityPercent, icon: TrendingUp, iconBg: "bg-blue-100", iconColor: "text-blue-600", barColor: "bg-blue-500" },
  ];

  return (
    <Card>
      <CardHeader><CardTitle>Account Health</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {items.map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`rounded-full p-2 ${item.iconBg}`}>
                  <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.sublabel}</p>
                </div>
              </div>
              <p className="text-lg font-bold">{item.value}</p>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full ${item.barColor} transition-all`} style={{ width: `${item.percent}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
