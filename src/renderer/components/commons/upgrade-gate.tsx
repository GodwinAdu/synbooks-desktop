/**
 * Upgrade Gate
 * Wraps a module page and shows an upgrade prompt if the user's plan
 * doesn't include that module.
 */

import { useNavigate } from "react-router-dom";
import { useLicense } from "@/contexts/license-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Crown, ArrowLeft } from "lucide-react";

interface UpgradeGateProps {
  moduleId: string;
  moduleName: string;
  children: React.ReactNode;
}

export function UpgradeGate({ moduleId, moduleName, children }: UpgradeGateProps) {
  const { canAccess, license } = useLicense();
  const navigate = useNavigate();

  if (canAccess(moduleId)) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
            <Lock className="h-8 w-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold">{moduleName} is locked</h2>
          <p className="text-sm text-muted-foreground">
            Your current plan ({license?.planName || "Free"}) doesn't include the {moduleName} module.
            Upgrade your plan to access this feature.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={() => navigate("/settings")} className="bg-amber-600 hover:bg-amber-700">
              <Crown className="h-4 w-4 mr-2" /> Upgrade Plan
            </Button>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
