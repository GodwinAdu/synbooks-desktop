/**
 * Settings Page
 * Tabbed layout matching the Next.js app's company settings structure.
 * Only includes tabs relevant for offline desktop use.
 */

import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Settings as SettingsIcon, DollarSign, FileText, Receipt, Users, Cloud, Crown, Boxes, UserCog, Database } from "lucide-react";
import { CompanyTab } from "./components/company-tab";
import { RegionalTab } from "./components/regional-tab";
import { InvoiceTab } from "./components/invoice-tab";
import { TaxTab } from "./components/tax-tab";
import { PayrollTab } from "./components/payroll-tab";
import { CloudSyncTab } from "./components/cloud-sync-tab";
import { DataManagementTab } from "./components/data-management-tab";
import { APP_VERSION, APP_NAME } from "@/lib/version";
import { SubscriptionTab } from "./components/subscription-tab";
import { ModulesTab } from "./components/modules-tab";
import { UsersTab } from "./components/users-tab";
import { useLicense } from "@/contexts/license-context";

const BASE_TABS = [
  { value: "company", label: "Company", icon: Building2 },
  { value: "regional", label: "Regional", icon: SettingsIcon },
  { value: "invoice", label: "Invoice", icon: FileText },
  { value: "tax", label: "Tax", icon: Receipt },
  { value: "payroll", label: "Payroll", icon: Users },
  { value: "users", label: "Users & Roles", icon: UserCog },
  { value: "modules", label: "Modules", icon: Boxes },
  { value: "subscription", label: "Subscription", icon: Crown },
  { value: "data", label: "Data", icon: Database },
] as const;

const CLOUD_TAB = { value: "cloud" as const, label: "Cloud Sync", icon: Cloud };

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState("company");
  const { license } = useLicense();

  // Only show Cloud Sync tab for Enterprise and Trial plans
  const planId = license?.planId || "free";
  const showCloudTab = planId === "enterprise";

  const tabs = useMemo(() => {
    return showCloudTab ? [...BASE_TABS, CLOUD_TAB] : [...BASE_TABS];
  }, [showCloudTab]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your organization settings and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1">
          {tabs.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="flex items-center gap-1.5">
              <Icon className="h-4 w-4" />{label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          {activeTab === "company" && <CompanyTab />}
          {activeTab === "regional" && <RegionalTab />}
          {activeTab === "invoice" && <InvoiceTab />}
          {activeTab === "tax" && <TaxTab />}
          {activeTab === "payroll" && <PayrollTab />}
          {activeTab === "users" && <UsersTab />}
          {activeTab === "modules" && <ModulesTab />}
          {activeTab === "subscription" && <SubscriptionTab />}
          {activeTab === "data" && <DataManagementTab />}
          {activeTab === "cloud" && showCloudTab && <CloudSyncTab />}
        </div>
      </Tabs>

      {/* App version */}
      <div className="pt-4 border-t text-center text-xs text-muted-foreground">
        <p>{APP_NAME} v{APP_VERSION}</p>
        <p className="mt-0.5">© {new Date().getFullYear()} SyncBooks. All rights reserved.</p>
      </div>
    </div>
  );
}
