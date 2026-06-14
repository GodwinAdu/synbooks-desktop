/**
 * Plan Banner
 * Shows a non-intrusive banner for trial users and expired licenses.
 * Displayed at the top of the dashboard layout.
 */

import { useNavigate } from "react-router-dom";
import { useLicense } from "@/contexts/license-context";
import { Button } from "@/components/ui/button";
import { Crown, Clock, AlertTriangle, X } from "lucide-react";
import { useState } from "react";

export function PlanBanner() {
  const { license } = useLicense();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !license) return null;

  // Active paid plan - no banner needed
  if (license.status === "active" && license.planId !== "free") return null;

  // Trial
  if (license.status === "trial") {
    return (
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <Clock className="h-4 w-4" />
          <span>
            <strong>Free Trial</strong> — {license.daysLeft} days remaining. All features unlocked.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-100" onClick={() => navigate("/settings")}>
            <Crown className="h-3 w-3 mr-1" /> Activate License
          </Button>
          <button onClick={() => setDismissed(true)} className="text-blue-400 hover:text-blue-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Expired
  if (license.status === "expired") {
    return (
      <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" />
          <span>
            <strong>License expired</strong> — You're on the Free plan with limited features.
          </span>
        </div>
        <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700" onClick={() => navigate("/settings")}>
          <Crown className="h-3 w-3 mr-1" /> Renew License
        </Button>
      </div>
    );
  }

  // Free plan (trial ended, no license)
  if (license.status === "free") {
    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-amber-700">
          <Crown className="h-4 w-4" />
          <span>
            <strong>Free Plan</strong> — Only Accounting, Banking & Reports available. Purchase a license to unlock more.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100" onClick={() => navigate("/settings")}>
            <Crown className="h-3 w-3 mr-1" /> Upgrade
          </Button>
          <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
