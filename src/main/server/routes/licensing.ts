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
licensingRouter.post("/activate", (req: AuthenticatedRequest, res: Response) => {
  const { key } = req.body;
  if (!key) { res.status(400).json({ success: false, error: "License key is required" }); return; }

  const result = activateLicenseKey(key);
  if (result.success) {
    const { plan, status, daysLeft, expiresAt } = getActivePlan();
    res.json({ success: true, planId: plan.id, planName: plan.name, status, daysLeft, expiresAt, modules: plan.modules });
  } else {
    res.status(400).json({ success: false, error: result.error });
  }
});

/** POST /api/licensing/deactivate */
licensingRouter.post("/deactivate", (_req: AuthenticatedRequest, res: Response) => {
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
