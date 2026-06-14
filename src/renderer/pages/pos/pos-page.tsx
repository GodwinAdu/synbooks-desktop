import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { POSTerminal } from "./components/pos-terminal";
import { SalesHistory } from "./components/sales-history";
import { POSSessionPanel } from "./components/pos-session";
import { DailySalesSheet } from "./components/daily-sales-sheet";
import { POSSession } from "./types";
import { MonitorSmartphone, History, Clock, WifiOff, Keyboard, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";

// Offline queue stored in localStorage
const OFFLINE_QUEUE_KEY = "pos-offline-queue";

function getOfflineQueue(): any[] {
  try { return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]"); } catch { return []; }
}
function saveOfflineQueue(queue: any[]) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export function POSPage() {
  const [session, setSession] = useState<POSSession | null>(() => {
    const stored = localStorage.getItem("pos-session");
    if (stored) { try { return JSON.parse(stored); } catch { return null; } }
    return null;
  });
  const [offlineQueue, setOfflineQueue] = useState<any[]>(getOfflineQueue());
  const [syncing, setSyncing] = useState(false);

  // Try to sync offline queue when component mounts or becomes online
  useEffect(() => {
    const syncQueue = async () => {
      const queue = getOfflineQueue();
      if (queue.length === 0) return;

      setSyncing(true);
      let synced = 0;
      const remaining: any[] = [];

      for (const sale of queue) {
        try {
          await api.post("/pos/sales", sale);
          synced++;
        } catch {
          remaining.push(sale);
        }
      }

      saveOfflineQueue(remaining);
      setOfflineQueue(remaining);
      setSyncing(false);

      if (synced > 0) {
        toast.success(`${synced} offline sale${synced > 1 ? "s" : ""} synced`);
      }
    };

    syncQueue();

    // Also listen for online event
    const handleOnline = () => syncQueue();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  const handleOpenSession = (cashierName: string, openingFloat: number) => {
    const newSession: POSSession = {
      cashierName, openingFloat,
      startTime: new Date().toISOString(),
      salesCount: 0, totalSales: 0, isActive: true,
    };
    setSession(newSession);
    localStorage.setItem("pos-session", JSON.stringify(newSession));
  };

  const handleCloseSession = () => {
    setSession(null);
    localStorage.removeItem("pos-session");
  };

  // Track sales in session
  const handleSaleCompleted = (amount: number) => {
    if (session) {
      const updated = { ...session, salesCount: session.salesCount + 1, totalSales: session.totalSales + amount };
      setSession(updated);
      localStorage.setItem("pos-session", JSON.stringify(updated));
    }
  };

  const [activeTab, setActiveTab] = useState("terminal");

  return (
    <div className="h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <TabsList>
            <TabsTrigger value="terminal" className="gap-1.5">
              <MonitorSmartphone className="h-3.5 w-3.5" />
              Terminal
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="h-3.5 w-3.5" />
              Sales History
            </TabsTrigger>
            <TabsTrigger value="session" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Session
            </TabsTrigger>
            <TabsTrigger value="daily" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Daily Sheet
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            {/* Offline queue indicator */}
            {offlineQueue.length > 0 && (
              <Badge variant="outline" className="border-amber-500 text-amber-600 gap-1">
                <WifiOff className="h-3 w-3" />
                {offlineQueue.length} queued
              </Badge>
            )}

            {/* Keyboard shortcuts hint */}
            <div className="hidden lg:flex items-center gap-1 text-[10px] text-muted-foreground">
              <Keyboard className="h-3 w-3" />
              <span>Ctrl+B scan • Ctrl+P pay • F5 refresh</span>
            </div>

            {/* Session indicator */}
            {session?.isActive && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span>{session.cashierName}</span>
                <span className="text-[10px]">({session.salesCount} sales)</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <TabsContent value="terminal" className="mt-0 h-full">
          <POSTerminal onSaleCompleted={handleSaleCompleted} sessionActive={!!session?.isActive} sessionCashier={session?.cashierName} onOpenSession={() => setActiveTab("session")} />
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <SalesHistory />
        </TabsContent>

        <TabsContent value="session" className="mt-0">
          <POSSessionPanel
            session={session}
            onOpenSession={handleOpenSession}
            onCloseSession={handleCloseSession}
          />
        </TabsContent>

        <TabsContent value="daily" className="mt-0">
          <DailySalesSheet />
        </TabsContent>
      </Tabs>
    </div>
  );
}
