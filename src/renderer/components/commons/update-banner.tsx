/**
 * Update Banner
 * Checks GitHub releases for newer versions and shows a non-intrusive banner.
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

const GITHUB_REPO = "GodwinAdu/synbooks-desktop";
const CHECK_INTERVAL = 6 * 60 * 60 * 1000; // Check every 6 hours
const CURRENT_VERSION = "1.0.2"; // Update this with each release

interface ReleaseInfo {
  version: string;
  url: string;
  name: string;
}

export function UpdateBanner() {
  const [update, setUpdate] = useState<ReleaseInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkForUpdate();
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  async function checkForUpdate() {
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
        headers: { "Accept": "application/vnd.github.v3+json" },
      });
      if (!res.ok) return;

      const data = await res.json();
      const latestVersion = data.tag_name?.replace("v", "") || "";

      if (latestVersion && isNewer(latestVersion, CURRENT_VERSION)) {
        // Find the right asset for this OS
        const platform = detectPlatform();
        const assets: any[] = data.assets || [];
        const asset = assets.find((a: any) => {
          const name = a.name.toLowerCase();
          if (platform === "win" && (name.includes("win32") || name.includes("windows") || name.endsWith(".exe"))) return true;
          if (platform === "mac" && (name.includes("darwin") || name.includes("macos"))) return true;
          if (platform === "linux" && (name.includes("linux") || name.endsWith(".deb"))) return true;
          return false;
        });

        setUpdate({
          version: latestVersion,
          url: asset?.browser_download_url || data.html_url,
          name: data.name || `v${latestVersion}`,
        });
      }
    } catch {
      // Silently fail — user might be offline
    }
  }

  function detectPlatform(): "win" | "mac" | "linux" {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("win")) return "win";
    if (ua.includes("mac")) return "mac";
    return "linux";
  }

  if (!update || dismissed) return null;

  return (
    <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-emerald-700">
        <Download className="h-4 w-4" />
        <span>
          <strong>Update available:</strong> SyncBooks Desktop {update.name} is ready.
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
          onClick={() => window.open(update.url, "_blank")}
        >
          <Download className="h-3 w-3 mr-1" /> Download
        </Button>
        <button onClick={() => setDismissed(true)} className="text-emerald-400 hover:text-emerald-600">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Compare semver strings: returns true if a > b */
function isNewer(a: string, b: string): boolean {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}
