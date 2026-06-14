import { Landmark } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface BankAccountCardProps {
  account: {
    id: string;
    accountName: string;
    bankName: string;
    currentBalance: number;
    accountType: string;
    currency?: string;
  };
}

export function BankAccountCard({ account }: BankAccountCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{account.bankName}</p>
            <p className="text-lg font-semibold">{account.accountName}</p>
          </div>
          <Landmark className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="mt-4">
          <p className="text-2xl font-bold">{formatCurrency(account.currentBalance)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {account.accountType} • {account.currency || "GHS"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
