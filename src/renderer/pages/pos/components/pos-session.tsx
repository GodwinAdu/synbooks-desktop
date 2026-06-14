import { useState } from "react";
import { POSSession } from "../types";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Clock, DollarSign, ShoppingCart, User } from "lucide-react";

interface POSSessionPanelProps {
  session: POSSession | null;
  onOpenSession: (cashierName: string, openingFloat: number) => void;
  onCloseSession: () => void;
}

export function POSSessionPanel({ session, onOpenSession, onCloseSession }: POSSessionPanelProps) {
  const [cashierName, setCashierName] = useState("");
  const [openingFloat, setOpeningFloat] = useState("");

  const handleStart = () => {
    if (!cashierName.trim()) return;
    onOpenSession(cashierName.trim(), parseFloat(openingFloat) || 0);
    setCashierName("");
    setOpeningFloat("");
  };

  if (!session || !session.isActive) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 space-y-4">
            <div className="text-center space-y-1">
              <Clock className="h-8 w-8 mx-auto text-primary" />
              <h2 className="text-lg font-semibold">Open POS Session</h2>
              <p className="text-xs text-muted-foreground">Start a new session to begin selling</p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Cashier Name</Label>
                <Input
                  placeholder="Enter your name"
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Opening Float (Cash in Drawer)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleStart} disabled={!cashierName.trim()}>
                Start Session
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active session view
  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-4">
          <div className="text-center space-y-1">
            <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold">Session Active</h2>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground">Cashier</p>
                <p className="text-xs font-medium">{session.cashierName}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground">Started</p>
                <p className="text-xs font-medium">
                  {new Date(session.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground">Sales</p>
                <p className="text-xs font-medium">{session.salesCount} transactions</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] text-muted-foreground">Total Sales</p>
                <p className="text-xs font-medium">{formatCurrency(session.totalSales)}</p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Opening Float</span>
              <span className="font-medium">{formatCurrency(session.openingFloat)}</span>
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-muted-foreground">Expected Cash</span>
              <span className="font-bold">{formatCurrency(session.openingFloat + session.totalSales)}</span>
            </div>
          </div>

          <Button variant="destructive" className="w-full" onClick={onCloseSession}>
            Close Session
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
