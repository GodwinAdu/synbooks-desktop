/**
 * Licensing API Routes
 */

import { Router, Response } from "express";
import { AuthenticatedRequest } from "../middleware/local-auth";
import {
  getActivePlan,
  activateLicenseKey,
  deactivateLicense,
  getLicenseState,
  generateLicenseKey,
  updateCloudPlan,
} from "../../licensing/license-manager";
import { PLANS, ALL_MODULES, MODULE_INFO } from "../../licensing/plans";

export const licensingRouter = Router();

/** GET /api/licensing/status */
licensingRouter.get("/status", (_req: AuthenticatedRequest, res: Response) => {
  const { plan, status, daysLeft, expiresAt } = getActivePlan();
  const state = getLicenseState();

  res.json({
    planId: plan.id,
    planName: plan.name,
    description: plan.description,
    status,
    daysLeft,
    expiresAt,
    modules: plan.modules,
    cloudSync: plan.cloudSync,
    maxUsers: plan.maxUsers,
    seats: state.seats || 1,
    price: plan.price,
    color: plan.color,
    hasLicenseKey: !!state.licenseKey,
    trialStartedAt: state.trialStartedAt,
  });
});

/** GET /api/licensing/plans */
licensingRouter.get("/plans", (_req: AuthenticatedRequest, res: Response) => {
  const plans = Object.values(PLANS).filter((p) => p.id !== "trial" && p.id !== "free");
  res.json({ plans, allModules: ALL_MODULES, moduleInfo: MODULE_INFO });
});

/** POST /api/licensing/activate */
licensingRouter.post("/activate", async (req: AuthenticatedRequest, res: Response) => {
  const { key } = req.body;
  if (!key) { res.status(400).json({ success: false, error: "License key is required" }); return; }

  // Step 1: Validate key format locally
  const result = activateLicenseKey(key);
  if (!result.success) {
    res.status(400).json({ success: false, error: result.error });
    return;
  }

  // Step 2: Try to verify with cloud (seat management)
  // This registers the machine and checks seat availability
  try {
    const os = require("os");
    const crypto = require("crypto");
    const machineRaw = `${os.hostname()}-${os.userInfo().username}-${os.platform()}-${os.arch()}-${os.homedir()}`;
    const machineId = crypto.createHmac("sha256", "sb-machine-bind-2024").update(machineRaw).digest("hex").slice(0, 16);

    const cloudUrl = process.env.CLOUD_API_URL || "https://syncbooksapp.com";
    const response = await fetch(`${cloudUrl}/api/desktop-license/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey: key, machineId, hostname: os.hostname() }),
    });

    if (response.ok) {
      const cloudResult: any = await response.json();
      if (!cloudResult.success) {
        // Cloud rejected — seat limit reached, revoke local activation
        deactivateLicense();
        res.status(403).json({ success: false, error: cloudResult.error || "Activation rejected by server" });
        return;
      }
      // Cloud confirmed — return success with cloud info
      const { plan, status, daysLeft, expiresAt } = getActivePlan();
      res.json({
        success: true, planId: plan.id, planName: plan.name, status, daysLeft, expiresAt,
        modules: plan.modules, seats: cloudResult.seats, usedSeats: cloudResult.usedSeats,
      });
      return;
    } else {
      // Cloud returned an error (403 = seats full, 404 = key not found, etc.)
      const errorBody: any = await response.json().catch(() => ({}));
      if (response.status === 403 || response.status === 404) {
        // Definitive rejection — revoke local activation
        deactivateLicense();
        res.status(response.status).json({ success: false, error: errorBody.error || "License rejected by server" });
        return;
      }
      // Other server errors (500) — fall through to offline mode
    }
    // If cloud is unreachable (offline), allow local activation
  } catch (cloudErr) {
    // Network error — reject activation (internet required for seat verification)
    deactivateLicense();
    res.status(503).json({ 
      success: false, 
      error: "Internet connection required to activate license. Please connect to the internet and try again." 
    });
    return;
  }

  // Should not reach here, but just in case
  const { plan, status, daysLeft, expiresAt } = getActivePlan();
  res.json({ success: true, planId: plan.id, planName: plan.name, status, daysLeft, expiresAt, modules: plan.modules });
});

/** POST /api/licensing/deactivate */
licensingRouter.post("/deactivate", async (_req: AuthenticatedRequest, res: Response) => {
  // Try to release seat on cloud
  try {
    const state = getLicenseState();
    if (state.licenseKey && state.machineId) {
      const cloudUrl = process.env.CLOUD_API_URL || "https://syncbooksapp.com";
      await fetch(`${cloudUrl}/api/desktop-license/deactivate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: state.licenseKey, machineId: state.machineId }),
      }).catch(() => {}); // Ignore network errors
    }
  } catch {}

  deactivateLicense();
  const { plan, status } = getActivePlan();
  res.json({ success: true, planId: plan.id, status });
});

/** POST /api/licensing/sync-cloud-plan */
licensingRouter.post("/sync-cloud-plan", (req: AuthenticatedRequest, res: Response) => {
  const { planId, expiresAt } = req.body;
  if (!planId) { res.status(400).json({ error: "planId required" }); return; }
  const expiry = expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  updateCloudPlan(planId, expiry);
  const active = getActivePlan();
  res.json({ success: true, planId: active.plan.id, planName: active.plan.name, status: active.status });
});

/** POST /api/licensing/generate-key (DEV ONLY) */
licensingRouter.post("/generate-key", (req: AuthenticatedRequest, res: Response) => {
  const { tier = "BIZ", months = 12, seats = 1 } = req.body;
  const expiry = new Date();
  expiry.setMonth(expiry.getMonth() + months);
  const key = generateLicenseKey(tier, expiry, seats);
  res.json({ key, tier, seats, expiresAt: expiry.toISOString() });
});
