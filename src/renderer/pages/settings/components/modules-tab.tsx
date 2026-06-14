/**
 * Modules Settings Tab
 * Toggle which modules are visible in the sidebar.
 * Only modules included in the current plan can be enabled.
 */

import { useEffect, useState } from "react";
import { useLicense } from "@/contexts/license-context";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Lock } from "lucide-react";

const MODULE_INFO: Record<string, { label: string; description: string }> = {
  accounting: { label: "Accounting", description: "Chart of accounts, journal entries, general ledger" },
  banking: { label: "Banking", description: "Bank accounts, transactions, reconciliation" },
  sales: { label: "Sales & Invoicing", description: "Invoices, customers, estimates, payments" },
  expenses: { label: "Expenses & Bills", description: "Expenses, bills, vendors, purchase orders" },
  products: { label: "Products & Services", description: "Product catalog, inventory, stock management" },
  payroll: { label: "Payroll", description: "Employees, payroll runs, time tracking" },
  pos: { label: "Point of Sale", description: "POS terminal, sessions, daily sales" },
  reports: { label: "Reports", description: "Financial statements and analytics" },
  projects: { label: "Projects", description: "Project management and tracking" },
  crm: { label: "CRM", description: "Contacts, deals, sales pipeline" },
  budgets: { label: "Budgeting", description: "Budget planning and variance analysis" },
  assets: { label: "Fixed Assets", description: "Asset register and depreciation" },
  production: { label: "Production", description: "Manufacturing, BOMs, work orders" },
  procurement: { label: "Procurement", description: "Requisitions, goods receiving" },
  contracts: { label: "Contracts", description: "Contract management and recurring billing" },
};

export function ModulesTab() {
  const { license, canAccess } = useLicense();
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get("/settings/modules")
      .then((data: any) => {
        // If no module config exists, enable all licensed modules by default
        if (!data || Object.keys(data).length === 0) {
          const defaults: Record<string, boolean> = {};
          (license?.modules || []).forEach((m) => { defaults[m] = true; });
          setEnabledModules(defaults);
        } else {
          setEnabledModules(data);
        }
      })
      .catch(() => {
        const defaults: Record<string, boolean> = {};
        (license?.modules || []).forEach((m) => { defaults[m] = true; });
        setEnabledModules(defaults);
      })
      .finally(() => setLoaded(true));
  }, [license]);

  const handleToggle = (moduleId: string, checked: boolean) => {
    setEnabledModules((prev) => ({ ...prev, [moduleId]: checked }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/settings/modules", enabledModules);
      toast.success("Module preferences saved. Refresh to see sidebar changes.");
    } catch (err: any) {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Active Modules</CardTitle>
          <CardDescription>
            Choose which modules appear in your sidebar. Modules not included in your plan are locked.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {Object.entries(MODULE_INFO).map(([id, info]) => {
            const licensed = canAccess(id);
            const enabled = enabledModules[id] ?? false;

            return (
              <div key={id} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={licensed && enabled}
                    onCheckedChange={(v) => handleToggle(id, v)}
                    disabled={!licensed}
                  />
                  <div>
                    <p className={`text-sm font-medium ${!licensed ? "text-muted-foreground" : ""}`}>
                      {info.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{info.description}</p>
                  </div>
                </div>
                {!licensed && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Lock className="h-3 w-3" /> Upgrade
                  </Badge>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}
