import { useState, useMemo } from "react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { BankAccount, BankTransaction } from "../types";

interface Props {
  accounts: BankAccount[];
  transactions: BankTransaction[];
  onRefresh: () => void;
}

export function ReconciliationPage({ accounts, transactions, onRefresh }: Props) {
  const [selectedAccountId, setSelectedAccountId] = useState(
    accounts[0]?.id || ""
  );
  const [reconcilingIds, setReconcilingIds] = useState<Set<string>>(new Set());

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId),
    [accounts, selectedAccountId]
  );

  const unreconciledTransactions = useMemo(
    () =>
      transactions.filter(
        (tx) =>
          tx.bankAccountId === selectedAccountId && !tx.isReconciled
      ),
    [transactions, selectedAccountId]
  );

  const totalUnreconciled = useMemo(
    () => unreconciledTransactions.reduce((sum, tx) => sum + tx.amount, 0),
    [unreconciledTransactions]
  );

  const handleReconcile = async (transactionId: string) => {
    setReconcilingIds((prev) => new Set([...prev, transactionId]));
    try {
      await api.post(`/banking/transactions/${transactionId}/reconcile`);
      toast.success("Transaction reconciled");
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to reconcile");
    } finally {
      setReconcilingIds((prev) => {
        const next = new Set(prev);
        next.delete(transactionId);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Account to Reconcile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="space-y-2 flex-1">
              <Label htmlFor="reconcile-account">Bank Account</Label>
              <select
                id="reconcile-account"
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {accounts.length === 0 && (
                  <option value="">No accounts available</option>
                )}
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName} ({acc.bankName})
                  </option>
                ))}
              </select>
            </div>
            {selectedAccount && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-xl font-bold">
                  {formatCurrency(selectedAccount.currentBalance)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Unreconciled Transactions */}
      {unreconciledTransactions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CheckCircle className="h-10 w-10 mb-3 text-emerald-500" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm">
              No unreconciled transactions for this account.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Unreconciled Transactions ({unreconciledTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unreconciledTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {tx.description || "No description"}
                      </span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {tx.transactionType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span>{formatDate(tx.transactionDate)}</span>
                      {tx.payee && <span>• {tx.payee}</span>}
                      {tx.referenceNumber && (
                        <span>• Ref: {tx.referenceNumber}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-semibold text-sm ${
                        tx.transactionType === "deposit" ||
                        tx.transactionType === "interest"
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {tx.transactionType === "deposit" ||
                      tx.transactionType === "interest"
                        ? "+"
                        : "-"}
                      {formatCurrency(Math.abs(tx.amount))}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reconcilingIds.has(tx.id)}
                      onClick={() => handleReconcile(tx.id)}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      {reconcilingIds.has(tx.id) ? "..." : "Reconcile"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {unreconciledTransactions.length} unreconciled transaction
                {unreconciledTransactions.length !== 1 ? "s" : ""}
              </span>
              <span className="font-medium">
                Total: {formatCurrency(totalUnreconciled)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
