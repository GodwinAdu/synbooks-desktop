/**
 * Sidebar Sync Status Indicator
 * Shows online/offline status and pending sync count.
 */

import { Cloud, CloudOff, RefreshCw, Loader2 } from "lucide-react";
import { useSync } from "@/contexts/sync-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SidebarSyncStatus() {
  const { status, isOnline, triggerSync } = useSync();

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-border/50">
      {/* Status indicator */}
      {isOnline ? (
        <Cloud className="size-3.5 text-green-500 shrink-0" />
      ) : (
        <CloudOff className="size-3.5 text-amber-500 shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <span className={cn("text-xs font-medium", isOnline ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")}>
          {isOnline ? "Online" : "Offline"}
        </span>
        {status.pendingChanges > 0 && (
          <span className="text-xs text-muted-foreground ml-1">
            ({status.pendingChanges} pending)
          </span>
        )}
      </div>

      {/* Sync button */}
      {isOnline && status.connected && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={triggerSync}
          disabled={status.syncing}
          title="Sync now"
        >
          {status.syncing ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <RefreshCw className="size-3" />
          )}
        </Button>
      )}
    </div>
  );
}
