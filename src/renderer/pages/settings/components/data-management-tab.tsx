/**
 * Data Management Tab
 * Database info, export, clear data, and danger zone.
 */

import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Database, HardDrive, Trash2, Download, RefreshCw, AlertTriangle,
  FileText, Users, ShoppingCart, Receipt, Loader2, Shield, CheckCircle2,
} from "lucide-react";
import { APP_VERSION } from "@/lib/version";

interface DatabaseStats {
  totalSize: string;
  tables: Record<string, number>;
  path: string;
  lastModified: string;
}

export function DataManagementTab() {
  const { logout } = useAuth();
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [clearing, setClearing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res: any = await api.get("/settings/database-stats");
      setStats(res);
    } catch {
      // Endpoint might not exist yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const totalRecords = stats?.tables
    ? Object.values(stats.tables).reduce((sum, count) => sum + count, 0)
    : 0;

  const handleExport = async () => {
    setExporting(true);
    try {
      const res: any = await api.get("/settings/export-data");
      // Download as JSON
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `syncbooks-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch (err: any) {
      toast.error(err.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleClearTransactions = async () => {
    if (confirmText !== "CLEAR") return;
    setClearing(true);
    try {
      await api.post("/settings/clear-transactions");
      toast.success("All transaction data cleared");
      setShowClearDialog(false);
      setConfirmText("");
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || "Failed to clear data");
    } finally {
      setClearing(false);
    }
  };

  const handleFactoryReset = async () => {
    if (confirmText !== "RESET") return;
    setClearing(true);
    try {
      await api.post("/settings/factory-reset");
      toast.success("Factory reset complete. Logging out...");
      setShowResetDialog(false);
      setTimeout(() => {
        logout();
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || "Failed to reset");
    } finally {
      setClearing(false);
    }
  };

  const TABLE_ICONS: Record<string, any> = {
    invoices: FileText,
    customers: Users,
    products: ShoppingCart,
    expenses: Receipt,
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Database Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-emerald-600" />
                Database Overview
              </CardTitle>
              <CardDescription>Local SQLite database information and statistics</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded animate-pulse w-48" />
              <div className="h-4 bg-muted rounded animate-pulse w-32" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg text-center">
                  <HardDrive className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-lg font-bold">{stats?.totalSize || "—"}</p>
                  <p className="text-xs text-muted-foreground">Database Size</p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <Database className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-lg font-bold">{totalRecords.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Records</p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <Shield className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-lg font-bold">WAL</p>
                  <p className="text-xs text-muted-foreground">Journal Mode</p>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
                  <p className="text-lg font-bold">v{APP_VERSION}</p>
                  <p className="text-xs text-muted-foreground">App Version</p>
                </div>
              </div>

              {/* Table breakdown */}
              {stats?.tables && Object.keys(stats.tables).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Records by Table</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(stats.tables)
                      .filter(([_, count]) => count > 0)
                      .sort(([, a], [, b]) => b - a)
                      .map(([table, count]) => (
                        <div key={table} className="flex items-center justify-between px-3 py-2 border rounded text-sm">
                          <span className="text-muted-foreground capitalize">{table.replace(/_/g, " ")}</span>
                          <Badge variant="secondary" className="font-mono">{count}</Badge>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {stats?.path && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Location:</span> {stats.path}
                  </p>
                  {stats.lastModified && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">Last Modified:</span> {new Date(stats.lastModified).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-600" />
            Data Export
          </CardTitle>
          <CardDescription>
            Download a full backup of all your data as a JSON file. This can be used for archival or migration purposes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={exporting} className="bg-blue-600 hover:bg-blue-700">
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            {exporting ? "Exporting..." : "Export All Data (JSON)"}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Includes all accounts, transactions, invoices, customers, employees, and settings.
          </p>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            These actions are destructive and cannot be undone. Make sure you have a backup before proceeding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Clear Transactions */}
          <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-900 rounded-lg">
            <div>
              <p className="font-medium text-sm">Clear Transaction Data</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Removes all invoices, expenses, bills, journal entries, GL entries, payments, and payroll runs.
                Keeps accounts, customers, vendors, products, employees, and settings.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 shrink-0"
              onClick={() => { setShowClearDialog(true); setConfirmText(""); }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>

          {/* Factory Reset */}
          <div className="flex items-center justify-between p-4 border border-red-200 dark:border-red-900 rounded-lg bg-red-50/50 dark:bg-red-950/10">
            <div>
              <p className="font-medium text-sm text-red-700 dark:text-red-400">Factory Reset</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Deletes ALL data including accounts, settings, and user data. The app will return to its initial state as if freshly installed. You will be logged out.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="shrink-0"
              onClick={() => { setShowResetDialog(true); setConfirmText(""); }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clear Transactions Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Clear Transaction Data
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all transaction data including invoices, expenses, bills, journal entries, general ledger entries, payments, and payroll runs. Master data (accounts, customers, vendors, products, employees) and settings will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">⚠️ This action cannot be undone!</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Type <span className="font-mono font-bold">CLEAR</span> to confirm</Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type CLEAR"
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleClearTransactions}
              disabled={confirmText !== "CLEAR" || clearing}
            >
              {clearing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {clearing ? "Clearing..." : "Clear All Transactions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Factory Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Factory Reset
            </DialogTitle>
            <DialogDescription>
              This will delete the entire database and all settings. The application will return to its initial state. You will be logged out and need to register again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">⚠️ ALL data will be permanently destroyed!</p>
              <ul className="text-xs text-red-600 dark:text-red-400 mt-2 space-y-0.5 list-disc list-inside">
                <li>All accounts, transactions, and financial data</li>
                <li>All customers, vendors, products, and employees</li>
                <li>All settings and preferences</li>
                <li>User account and login credentials</li>
              </ul>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Type <span className="font-mono font-bold">RESET</span> to confirm</Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type RESET"
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleFactoryReset}
              disabled={confirmText !== "RESET" || clearing}
            >
              {clearing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              {clearing ? "Resetting..." : "Factory Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
