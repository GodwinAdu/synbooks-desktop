/**
 * License Manager
 * Simple annual tier licensing.
 * 
 * License key format: TIER-YYYYMMDD-XXXXXXXX-CHECKSUM
 * Where:
 *   TIER = STR (Starter), BIZ (Business), ENT (Enterprise)
 *   YYYYMMDD = expiry date
 *   XXXXXXXX = 8 random hex chars
 *   CHECKSUM = first 8 chars of HMAC-SHA256(TIER-YYYYMMDD-XXXXXXXX, secret)
 */

import crypto from "crypto";
import Store from "electron-store";
import log from "electron-log";
import { getPlan, type PlanDefinition } from "./plans";

const LICENSE_SECRET = "syncbooks-desktop-license-2024-gh";
const TRIAL_DAYS = 14;
const MACHINE_SALT = "sb-machine-bind-2024";

interface LicenseState {
  planId: string;
  licenseKey?: string;
  activatedAt?: string;
  expiresAt?: string;
  trialStartedAt?: string;
  cloudPlan?: string;
  cloudExpiresAt?: string;
  machineId?: string;
  lastCheckedAt?: string;
  seats?: number;
}

let store: Store<Record<string, any>> | null = null;

function getStore(): any {
  if (!store) {
    store = new Store({
      name: "syncbooks-license",
      encryptionKey: "sb-desktop-enc-2024-gh-key",
    } as any);
  }
  return store;
}

/** Generate a unique machine fingerprint — license bound to this machine */
function getMachineId(): string {
  const os = require("os");
  const raw = `${os.hostname()}-${os.userInfo().username}-${os.platform()}-${os.arch()}-${os.homedir()}`;
  return crypto.createHmac("sha256", MACHINE_SALT).update(raw).digest("hex").slice(0, 16);
}

/** Anti-clock-tamper: reject if clock was set backwards by more than 1 day */
function isClockTampered(): boolean {
  const s = getStore();
  const lastChecked = s.get("lastCheckedAt") as string | undefined;
  const now = new Date();

  if (lastChecked) {
    const lastDate = new Date(lastChecked);
    if (now.getTime() < lastDate.getTime() - (24 * 60 * 60 * 1000)) {
      log.warn("Clock tampering detected");
      return true;
    }
  }
  s.set("lastCheckedAt", now.toISOString());
  return false;
}

export interface ActivePlanResult {
  plan: PlanDefinition;
  status: "active" | "trial" | "expired" | "free";
  daysLeft?: number;
  expiresAt?: string;
}

/**
 * Get the current active plan.
 * Priority: Cloud > License Key > Trial > Free
 * Also checks for clock tampering and machine binding.
 */
export function getActivePlan(): ActivePlanResult {
  const state = getLicenseState();
  const now = new Date();

  // Anti-tamper: if clock was set backward, treat as expired
  if (isClockTampered()) {
    return { plan: getPlan("free"), status: "expired" };
  }

  // 1. Cloud subscription (synced from web app — Enterprise only)
  if (state.cloudPlan && state.cloudExpiresAt) {
    const expiry = new Date(state.cloudExpiresAt);
    if (expiry > now) {
      return {
        plan: getPlan(state.cloudPlan),
        status: "active",
        daysLeft: Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        expiresAt: state.cloudExpiresAt,
      };
    }
  }

  // 2. License key
  if (state.licenseKey && state.expiresAt) {
    const expiry = new Date(state.expiresAt);
    if (expiry > now) {
      return {
        plan: getPlan(state.planId),
        status: "active",
        daysLeft: Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        expiresAt: state.expiresAt,
      };
    } else {
      return { plan: getPlan("free"), status: "expired" };
    }
  }

  // 3. Trial
  if (state.trialStartedAt) {
    const trialStart = new Date(state.trialStartedAt);
    const trialEnd = new Date(trialStart.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    if (now < trialEnd) {
      return {
        plan: getPlan("trial"),
        status: "trial",
        daysLeft: Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        expiresAt: trialEnd.toISOString(),
      };
    }
  }

  // 4. Free
  return { plan: getPlan("free"), status: "free" };
}

/**
 * Start trial (first launch).
 */
export function startTrial(): void {
  const s = getStore();
  if (!s.get("trialStartedAt")) {
    s.set("trialStartedAt", new Date().toISOString());
    log.info("Trial period started (14 days)");
  }
}

/**
 * Activate a license key.
 * Binds the key to this specific machine.
 */
export function activateLicenseKey(key: string): { success: boolean; error?: string; plan?: string; seats?: number; expiresAt?: string } {
  const parsed = parseLicenseKey(key);
  if (!parsed.valid) return { success: false, error: parsed.error };

  const s = getStore();
  const machineId = getMachineId();

  s.set("licenseKey", key);
  s.set("planId", parsed.planId!);
  s.set("seats", parsed.seats || 1);
  s.set("expiresAt", parsed.expiresAt!);
  s.set("activatedAt", new Date().toISOString());
  s.set("machineId", machineId);

  log.info(`License activated: ${parsed.planId} (${parsed.seats} seats) until ${parsed.expiresAt} on machine ${machineId}`);
  return { success: true, plan: parsed.planId, seats: parsed.seats, expiresAt: parsed.expiresAt };
}

/**
 * Deactivate license.
 */
export function deactivateLicense(): void {
  const s = getStore();
  s.delete("licenseKey");
  s.delete("planId");
  s.delete("expiresAt");
  s.delete("activatedAt");
  log.info("License deactivated");
}

/**
 * Update from cloud sync (Enterprise users who also have web subscription).
 */
export function updateCloudPlan(planId: string, expiresAt: string): void {
  const s = getStore();
  // Map web plan names to desktop tiers
  const map: Record<string, string> = {
    free: "free", starter: "starter", professional: "business",
    pro: "business", business: "business", enterprise: "enterprise", custom: "enterprise",
  };
  const mapped = map[planId.toLowerCase()] || "business";
  s.set("cloudPlan", mapped);
  s.set("cloudExpiresAt", expiresAt);
  log.info(`Cloud plan synced: ${mapped} until ${expiresAt}`);
}

/**
 * Get raw state.
 */
export function getLicenseState(): LicenseState {
  const s = getStore();
  return {
    planId: s.get("planId", "free") as string,
    licenseKey: s.get("licenseKey") as string | undefined,
    activatedAt: s.get("activatedAt") as string | undefined,
    expiresAt: s.get("expiresAt") as string | undefined,
    trialStartedAt: s.get("trialStartedAt") as string | undefined,
    cloudPlan: s.get("cloudPlan") as string | undefined,
    cloudExpiresAt: s.get("cloudExpiresAt") as string | undefined,
    machineId: s.get("machineId") as string | undefined,
    lastCheckedAt: s.get("lastCheckedAt") as string | undefined,
    seats: (s.get("seats") || 1) as number,
  };
}

/**
 * Parse and validate a license key.
 * Format: TIER-SEATS-YYYYMMDD-XXXXXXXX-CHECKSUM
 * SEATS = 2-digit number (01-99)
 */
function parseLicenseKey(key: string): { valid: boolean; error?: string; planId?: string; seats?: number; expiresAt?: string } {
  const parts = key.trim().toUpperCase().split("-");
  if (parts.length !== 5) return { valid: false, error: "Invalid key format. Expected: TIER-SEATS-DATE-CODE-CHECK" };

  const [tierCode, seatsStr, dateStr, random, checksum] = parts;

  // Tier
  const tierMap: Record<string, string> = { STR: "starter", BIZ: "business", ENT: "enterprise" };
  const planId = tierMap[tierCode];
  if (!planId) return { valid: false, error: "Invalid tier code. Use STR, BIZ, or ENT." };

  // Seats
  const seats = parseInt(seatsStr);
  if (isNaN(seats) || seats < 1 || seats > 99) return { valid: false, error: "Invalid seat count in key" };

  // Date
  if (!/^\d{8}$/.test(dateStr)) return { valid: false, error: "Invalid date format in key" };
  const year = parseInt(dateStr.slice(0, 4));
  const month = parseInt(dateStr.slice(4, 6)) - 1;
  const day = parseInt(dateStr.slice(6, 8));
  const expiryDate = new Date(year, month, day);
  if (isNaN(expiryDate.getTime())) return { valid: false, error: "Invalid expiry date" };
  if (expiryDate < new Date()) return { valid: false, error: "This license key has expired" };

  // Checksum
  const payload = `${tierCode}-${seatsStr}-${dateStr}-${random}`;
  const expected = crypto.createHmac("sha256", LICENSE_SECRET).update(payload).digest("hex").slice(0, 8).toUpperCase();
  if (checksum !== expected) return { valid: false, error: "Invalid license key" };

  return { valid: true, planId, seats, expiresAt: expiryDate.toISOString() };
}

/**
 * Generate a license key (admin use / backend).
 * @param tierCode - STR, BIZ, or ENT
 * @param seats - number of machines allowed (1-99)
 * @param expiryDate - when the key expires
 */
export function generateLicenseKey(tierCode: "STR" | "BIZ" | "ENT", expiryDate: Date, seats: number = 1): string {
  const seatsStr = String(Math.min(99, Math.max(1, seats))).padStart(2, "0");
  const dateStr = expiryDate.toISOString().slice(0, 10).replace(/-/g, "");
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  const payload = `${tierCode}-${seatsStr}-${dateStr}-${random}`;
  const checksum = crypto.createHmac("sha256", LICENSE_SECRET).update(payload).digest("hex").slice(0, 8).toUpperCase();
  return `${tierCode}-${seatsStr}-${dateStr}-${random}-${checksum}`;
}
