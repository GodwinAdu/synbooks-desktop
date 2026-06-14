/**
 * Plan Limits Middleware
 * 
 * In the annual tier model, there are no per-record limits.
 * Access is controlled by which modules are in the user's plan tier.
 * The checkPlanLimit function is kept for backward compatibility but is a no-op.
 */

import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./local-auth";
import { getActivePlan } from "../../licensing/license-manager";

/**
 * No-op limit check (annual tiers don't have record limits).
 */
export function checkPlanLimit(_resourceType: string) {
  return (_req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    next();
  };
}

/**
 * Check if the current plan includes a specific module.
 */
export function checkModuleAccess(moduleId: string) {
  return (_req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const { plan, status } = getActivePlan();

    // If expired or free, only allow free modules
    if (status === "expired" || status === "free") {
      const freeModules = ["accounting", "banking", "reports"];
      if (freeModules.includes(moduleId)) {
        next();
        return;
      }
      res.status(403).json({
        error: "License required",
        message: `Your trial has ended. Purchase a license to access ${moduleId}. Go to Settings → Subscription.`,
        currentPlan: plan.name,
        status,
      });
      return;
    }

    // Check if module is in the plan
    if (plan.modules.includes(moduleId)) {
      next();
      return;
    }

    res.status(403).json({
      error: "Module not available",
      message: `The "${moduleId}" module is not included in your ${plan.name} plan. Upgrade to access this feature.`,
      currentPlan: plan.name,
      requiredModule: moduleId,
    });
  };
}
