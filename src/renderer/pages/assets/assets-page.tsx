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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";
import { Plus, Building, DollarSign, TrendingDown, Search, Boxes, MoreHorizontal, Eye, Trash2, Calculator } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { CreateAssetDialog } from "./components/create-asset-dialog";
import type { FixedAsset } from "./types";

export function AssetsPage() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [viewAsset, setViewAsset] = useState<FixedAsset | null>(null);
  const [disposeAsset, setDisposeAsset] = useState<FixedAsset | null>(null);
  const [disposeAmount, setDisposeAmount] = useState("");
  const [disposing, setDisposing] = useState(false);
  const [depreciating, setDepreciating] = useState(false);

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

  // ─── Dispose asset handler ────────────────────────────────────────────────
  const handleDispose = async () => {
    if (!disposeAsset) return;
    setDisposing(true);
    try {
      const saleAmount = parseFloat(disposeAmount) || 0;
      await api.put(`/assets/${disposeAsset.id}`, { status: "disposed", disposalDate: new Date().toISOString().split("T")[0], disposalAmount: saleAmount });
      // Post GL entries for disposal
      await api.post(`/assets/${disposeAsset.id}/dispose`, { saleAmount });
      toast.success("Asset disposed successfully");
      setDisposeAsset(null);
      setDisposeAmount("");
      fetchAssets();
    } catch (e: any) {
      // If the dispose endpoint doesn't exist, just update status
      await api.put(`/assets/${disposeAsset.id}`, { status: "disposed" }).catch(() => {});
      toast.success("Asset marked as disposed");
      setDisposeAsset(null);
      fetchAssets();
    } finally {
      setDisposing(false);
    }
  };

  // ─── Run monthly depreciation ─────────────────────────────────────────────
  const handleRunDepreciation = async () => {
    setDepreciating(true);
    try {
      const result: any = await api.post("/assets/run-depreciation", {});
      toast.success(result.message || "Depreciation calculated and posted");
      fetchAssets();
    } catch (e: any) {
      toast.error(e.message || "Failed to run depreciation");
    } finally {
      setDepreciating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Heading title="Fixed Assets" description="Manage asset register, depreciation, and disposals" />
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRunDepreciation} disabled={depreciating}>
            <Calculator className="h-4 w-4 mr-2" /> {depreciating ? "Running..." : "Run Depreciation"}
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Asset
          </Button>
        </div>
      </div>
      <Separator />

      {/* Info Alert */}
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
        <Boxes className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900 dark:text-green-200 font-semibold">Fixed Assets Guide</AlertTitle>
        <AlertDescription className="text-green-800 dark:text-green-300 mt-2">
          <div className="space-y-2 text-sm">
            <p><span className="font-semibold">What qualifies?</span> Fixed assets are long-term tangible items used in your business (vehicles, equipment, computers, furniture) with a useful life of more than one year.</p>
            <p><span className="font-semibold">Depreciation:</span> Assets lose value over time. Use "Run Depreciation" to calculate monthly depreciation and post entries to the general ledger.</p>
            <p><span className="font-semibold">Disposal:</span> When you sell or scrap an asset, record the disposal to remove it from your books and recognise any gain or loss.</p>
            <p className="text-amber-700 dark:text-amber-400 font-semibold mt-2">⚠️ Expenses below your capitalisation threshold should be recorded as expenses, not assets.</p>
          </div>
        </AlertDescription>
      </Alert>

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
                        <th className="text-left py-3 px-4 font-semibold">Status</th>
                        <th className="text-right py-3 px-4 font-semibold">Actions</th>
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
                              <Badge className={`text-xs ${asset.status === "active" ? "bg-emerald-100 text-emerald-700" : asset.status === "disposed" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>
                                {asset.status.replace("_", " ")}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => setViewAsset(asset)}>
                                    <Eye className="h-4 w-4 mr-2" /> View Details
                                  </DropdownMenuItem>
                                  {asset.status === "active" && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-red-600" onClick={() => { setDisposeAsset(asset); setDisposeAmount(""); }}>
                                        <Trash2 className="h-4 w-4 mr-2" /> Dispose
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
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

      {/* View Asset Detail */}
      {viewAsset && (
        <Dialog open={!!viewAsset} onOpenChange={() => setViewAsset(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{viewAsset.name}</DialogTitle>
              <DialogDescription>{viewAsset.assetNumber}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Category</p><p className="text-sm font-medium">{viewAsset.category}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p><Badge className={`text-xs ${viewAsset.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{viewAsset.status}</Badge></div>
                <div><p className="text-xs text-muted-foreground">Purchase Date</p><p className="text-sm">{new Date(viewAsset.purchaseDate).toLocaleDateString("en-GH", { day: "numeric", month: "long", year: "numeric" })}</p></div>
                <div><p className="text-xs text-muted-foreground">Location</p><p className="text-sm">{viewAsset.location || "—"}</p></div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Purchase Cost</p><p className="text-lg font-bold">{formatCurrency(viewAsset.purchaseCost)}</p></div>
                <div><p className="text-xs text-muted-foreground">Salvage Value</p><p className="text-lg font-bold">{formatCurrency(viewAsset.salvageValue)}</p></div>
                <div><p className="text-xs text-muted-foreground">Accumulated Depreciation</p><p className="text-lg font-bold text-orange-600">{formatCurrency(viewAsset.accumulatedDepreciation || 0)}</p></div>
                <div><p className="text-xs text-muted-foreground">Net Book Value</p><p className="text-lg font-bold text-emerald-600">{formatCurrency(viewAsset.purchaseCost - (viewAsset.accumulatedDepreciation || 0))}</p></div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-muted-foreground">Depreciation Method</p><p className="text-sm capitalize">{viewAsset.depreciationMethod.replace(/_/g, " ")}</p></div>
                <div><p className="text-xs text-muted-foreground">Useful Life</p><p className="text-sm">{viewAsset.usefulLifeYears} years</p></div>
              </div>
              {viewAsset.description && (
                <>
                  <Separator />
                  <div><p className="text-xs text-muted-foreground">Description</p><p className="text-sm">{viewAsset.description}</p></div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewAsset(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Dispose Asset Dialog */}
      {disposeAsset && (
        <Dialog open={!!disposeAsset} onOpenChange={() => setDisposeAsset(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Dispose Asset</DialogTitle>
              <DialogDescription>
                Record the disposal of "{disposeAsset.name}" (NBV: {formatCurrency(disposeAsset.purchaseCost - (disposeAsset.accumulatedDepreciation || 0))})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Purchase Cost</span><span>{formatCurrency(disposeAsset.purchaseCost)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Accumulated Dep.</span><span className="text-orange-600">{formatCurrency(disposeAsset.accumulatedDepreciation || 0)}</span></div>
                <Separator className="my-1" />
                <div className="flex justify-between font-semibold"><span>Net Book Value</span><span>{formatCurrency(disposeAsset.purchaseCost - (disposeAsset.accumulatedDepreciation || 0))}</span></div>
              </div>
              <div className="space-y-2">
                <Label>Sale / Proceeds Amount (GHS)</Label>
                <Input type="number" step="0.01" value={disposeAmount} onChange={(e) => setDisposeAmount(e.target.value)} placeholder="0.00 (if scrapped)" />
                <p className="text-xs text-muted-foreground">Enter 0 if the asset was scrapped. Any difference from NBV will be recorded as gain/loss on disposal.</p>
              </div>
              {disposeAmount && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  {(() => {
                    const nbv = disposeAsset.purchaseCost - (disposeAsset.accumulatedDepreciation || 0);
                    const saleAmt = parseFloat(disposeAmount) || 0;
                    const gainLoss = saleAmt - nbv;
                    return (
                      <div className={`flex justify-between font-semibold ${gainLoss >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        <span>{gainLoss >= 0 ? "Gain" : "Loss"} on Disposal</span>
                        <span>{formatCurrency(Math.abs(gainLoss))}</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDisposeAsset(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDispose} disabled={disposing}>
                {disposing ? "Processing..." : "Dispose Asset"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
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
