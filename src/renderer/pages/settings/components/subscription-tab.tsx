/**
 * Subscription Tab
 * Simple 3-tier annual licensing display.
 */

import { useState, useEffect } from "react";
import { useLicense } from "@/contexts/license-context";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, Key, Crown, Sparkles, Shield, Clock, AlertTriangle } from "lucide-react";

interface PlanInfo {
  id: string;
  name: string;
  description: string;
  modules: string[];
  price: { monthly: number; annual: number };
  cloudSync: boolean;
  maxUsers: number;
  color: string;
}

export function SubscriptionTab() {
  const { license, activateKey, deactivateKey } = useLicense();
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [moduleInfo, setModuleInfo] = useState<Record<string, { name: string }>>({});
  const [keyInput, setKeyInput] = useState("");
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/licensing/plans")
      .then((res: any) => {
        setPlans(res.plans || []);
        setModuleInfo(res.moduleInfo || {});
      })
      .catch(console.error);
  }, []);

  const handleActivate = async () => {
    if (!keyInput.trim()) { setError("Enter a license key"); return; }
    setActivating(true);
    setError("");
    const result = await activateKey(keyInput.trim());
    setActivating(false);
    if (result.success) {
      toast.success("License activated successfully!");
      setKeyInput("");
    } else {
      setError(result.error || "Activation failed");
    }
  };

  const handleDeactivate = async () => {
    await deactivateKey();
    toast.success("License deactivated");
  };

  const statusBadge = () => {
    switch (license?.status) {
      case "active": return <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>;
      case "trial": return <Badge className="bg-blue-100 text-blue-700">Trial</Badge>;
      case "expired": return <Badge className="bg-red-100 text-red-700">Expired</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-700">Free</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" /> Your Plan
            </CardTitle>
            {statusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-2xl font-bold">{license?.planName || "Free"}</p>
              <p className="text-sm text-muted-foreground">{license?.description}</p>
            </div>
            <div className="ml-auto text-right">
              {license?.daysLeft !== undefined && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{license.daysLeft} days left</span>
                </div>
              )}
              {license?.expiresAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Expires {new Date(license.expiresAt).toLocaleDateString("en-GH", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
          </div>

          {license?.status === "trial" && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-700">
                You're on a <strong>14-day free trial</strong> with all modules unlocked.
                Purchase a license key to continue after the trial ends.
              </p>
            </div>
          )}

          {license?.status === "expired" && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">
                Your license has expired. You now have access to Accounting, Banking & Reports only.
                Renew to restore all modules.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* License Key Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4" /> Activate License Key
          </CardTitle>
          <CardDescription>Enter a license key purchased from SyncBooks or an authorized reseller</CardDescription>
        </CardHeader>
        <CardContent>
          {license?.hasLicenseKey ? (
            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600" />
                <span className="text-sm text-emerald-700 font-medium">{license.planName} — Active until {license.expiresAt ? new Date(license.expiresAt).toLocaleDateString("en-GH", { month: "short", year: "numeric" }) : "—"}</span>
              </div>
              <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50" onClick={handleDeactivate}>
                Deactivate
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-3">
                <Input
                  value={keyInput}
                  onChange={(e) => { setKeyInput(e.target.value.toUpperCase()); setError(""); }}
                  placeholder="BIZ-20270614-A1B2C3D4-E5F6G7H8"
                  className="font-mono flex-1"
                />
                <Button onClick={handleActivate} disabled={activating}>
                  {activating ? "Activating..." : "Activate"}
                </Button>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Cards */}
      <div>
        <h3 className="font-semibold mb-4">Choose Your Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.id === license?.planId;
            const isPopular = plan.id === "business";

            return (
              <Card key={plan.id} className={`relative ${isPopular ? "border-2 border-blue-500 shadow-lg" : ""} ${isCurrent ? "ring-2 ring-emerald-500" : ""}`}>
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white">Most Popular</Badge>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-3">
                    <Badge className="bg-emerald-600 text-white">Current</Badge>
                  </div>
                )}
                <CardContent className="pt-8 pb-6 text-center space-y-4">
                  <div>
                    <p className="text-xl font-bold">{plan.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold">GHS {plan.price.annual.toLocaleString()}</span>
                      <span className="text-sm text-muted-foreground">/year</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      (GHS {plan.price.monthly}/month equivalent)
                    </p>
                  </div>

                  <div className="text-left space-y-2 pt-2">
                    {plan.modules.map((mod) => (
                      <div key={mod} className="flex items-center gap-2 text-sm">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{moduleInfo[mod]?.name || mod}</span>
                      </div>
                    ))}
                    {plan.cloudSync && (
                      <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                        <Check className="h-3.5 w-3.5 shrink-0" />
                        <span>Cloud Sync included</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      <span>Up to {plan.maxUsers > 100 ? "unlimited" : plan.maxUsers} users</span>
                    </div>
                  </div>

                  {isCurrent ? (
                    <Button disabled className="w-full mt-2">Current Plan</Button>
                  ) : (
                    <Button variant={isPopular ? "default" : "outline"} className="w-full mt-2" onClick={() => window.open("https://syncbooksapp.com/desktop-license", "_blank")}>
                      Get {plan.name}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* How to purchase */}
      <Card className="bg-muted/30">
        <CardContent className="pt-5 pb-5">
          <p className="text-sm font-medium mb-2">How to purchase a license:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">1. Choose a plan</p>
              <p>Pick the tier that fits your business needs above.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">2. Get a license key</p>
              <p>Purchase from syncbooksapp.com, an authorized reseller, or contact us directly.</p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">3. Activate</p>
              <p>Enter your key above. Plan activates instantly — no internet required after that.</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            <p><strong>Enterprise users:</strong> Your plan also includes Cloud Sync — connect in the Cloud Sync tab to backup and sync across devices.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
