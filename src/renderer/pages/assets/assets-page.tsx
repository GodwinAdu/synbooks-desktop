/**
 * Fixed Assets Page
 * Asset register with depreciation tracking and management.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Plus, Building, DollarSign, TrendingDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CreateAssetDialog } from "./components/create-asset-dialog";
import type { FixedAsset } from "./types";

export function AssetsPage() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const fetchAssets = () => {
    setLoading(true);
    api.get("/assets", { pageSize: 200 })
      .then((res: any) => setAssets(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAssets(); }, []);

  const filtered = assets.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.category.toLowerCase().includes(search.toLowerCase()) ||
    (a.assetNumber && a.assetNumber.toLowerCase().includes(search.toLowerCase()))
  );

  const totalCost = assets.reduce((s, a) => s + (a.purchaseCost || 0), 0);
  const totalDepreciation = assets.reduce((s, a) => s + (a.accumulatedDepreciation || 0), 0);
  const totalNBV = totalCost - totalDepreciation;
  const activeCount = assets.filter((a) => a.status === "active").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Heading title="Fixed Assets" description="Manage asset register, depreciation, and disposals" />
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Asset
        </Button>
      </div>
      <Separator />

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
          <Skeleton className="h-96" />
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Total Assets" value={String(assets.length)} sub={`${activeCount} active`} icon={Building} color="text-blue-600" />
            <StatCard label="Total Cost" value={formatCurrency(totalCost)} icon={DollarSign} color="text-foreground" />
            <StatCard label="Accumulated Dep." value={formatCurrency(totalDepreciation)} icon={TrendingDown} color="text-orange-600" />
            <StatCard label="Net Book Value" value={formatCurrency(totalNBV)} icon={DollarSign} color="text-emerald-600" />
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search assets..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {/* Asset Table */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Building className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">No fixed assets found</p>
              <p className="text-sm">Register your first asset to start tracking depreciation.</p>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left py-3 px-4 font-semibold">Asset</th>
                        <th className="text-left py-3 px-4 font-semibold">Category</th>
                        <th className="text-left py-3 px-4 font-semibold">Purchase Date</th>
                        <th className="text-right py-3 px-4 font-semibold">Cost</th>
                        <th className="text-right py-3 px-4 font-semibold">Acc. Dep.</th>
                        <th className="text-right py-3 px-4 font-semibold">NBV</th>
                        <th className="text-left py-3 px-4 font-semibold">Method</th>
                        <th className="text-left py-3 px-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((asset) => {
                        const nbv = asset.purchaseCost - (asset.accumulatedDepreciation || 0);
                        return (
                          <tr key={asset.id} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="py-2.5 px-4">
                              <div>
                                <p className="font-medium">{asset.name}</p>
                                {asset.assetNumber && <p className="text-xs text-muted-foreground">{asset.assetNumber}</p>}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-muted-foreground">{asset.category}</td>
                            <td className="py-2.5 px-4 text-muted-foreground text-xs">
                              {new Date(asset.purchaseDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                            </td>
                            <td className="py-2.5 px-4 text-right tabular-nums">{formatCurrency(asset.purchaseCost)}</td>
                            <td className="py-2.5 px-4 text-right tabular-nums text-orange-600">
                              {formatCurrency(asset.accumulatedDepreciation || 0)}
                            </td>
                            <td className="py-2.5 px-4 text-right tabular-nums font-medium">{formatCurrency(nbv)}</td>
                            <td className="py-2.5 px-4">
                              <span className="text-xs capitalize">{asset.depreciationMethod.replace(/_/g, " ")}</span>
                            </td>
                            <td className="py-2.5 px-4">
                              <Badge className={`text-xs ${asset.status === "active" ? "bg-emerald-100 text-emerald-700" : asset.status === "disposed" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>
                                {asset.status.replace("_", " ")}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold bg-muted/30">
                        <td colSpan={3} className="py-3 px-4">TOTALS</td>
                        <td className="py-3 px-4 text-right tabular-nums">{formatCurrency(totalCost)}</td>
                        <td className="py-3 px-4 text-right tabular-nums text-orange-600">{formatCurrency(totalDepreciation)}</td>
                        <td className="py-3 px-4 text-right tabular-nums">{formatCurrency(totalNBV)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <CreateAssetDialog open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchAssets} />
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: any; color: string }) {
  return (
    <Card className="border-0 ring-1 ring-border/50">
      <CardContent className="pt-4 pb-3 flex items-center gap-3">
        <Icon className={`h-5 w-5 ${color}`} />
        <div>
          <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
          <p className={`text-base font-bold ${color}`}>{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
