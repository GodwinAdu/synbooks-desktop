import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { ArrowLeft, Send, Ban, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { JournalEntry } from "../types";

const statusStyles: Record<string, string> = {
  posted: "bg-emerald-600 text-white",
  draft: "bg-yellow-600 text-white",
  voided: "bg-red-600 text-white",
  reversed: "bg-red-600 text-white",
};

interface JournalEntryDetailProps {
  entryId: string;
  onBack: () => void;
}

export function JournalEntryDetail({ entryId, onBack }: JournalEntryDetailProps) {
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [accounts, setAccounts] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/journal-entries/${entryId}`),
      api.get("/accounts", { pageSize: 500 }),
    ])
      .then(([entryRes, accountsRes]: any[]) => {
        setEntry(entryRes.data || entryRes);
        // Build a map of accountId -> account for quick lookup
        const accts = Array.isArray(accountsRes) ? accountsRes : accountsRes.data || [];
        const map = new Map<string, any>();
        accts.forEach((a: any) => map.set(a.id, a));
        setAccounts(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [entryId]);

  // Helper to get account display name
  const getAccountDisplay = (line: any) => {
    const account = accounts.get(line.accountId);
    if (account) return { name: account.accountName, code: account.accountCode };
    if (line.accountName) return { name: line.accountName, code: line.accountCode };
    return { name: "Unknown Account", code: "" };
  };

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handlePost = async () => {
    if (!entry) return;
    setActionLoading("post");
    try {
      await api.post(`/journal-entries/${entry.id}/post`);
      toast.success("Journal entry posted successfully");
      // Refresh
      const res: any = await api.get(`/journal-entries/${entry.id}`);
      setEntry(res.data || res);
    } catch (err: any) {
      toast.error(err.message || "Failed to post entry");
    } finally {
      setActionLoading(null);
    }
  };

  const handleVoid = async () => {
    if (!entry) return;
    if (!confirm("Are you sure you want to void this journal entry? This will reverse the GL postings.")) return;
    setActionLoading("void");
    try {
      await api.post(`/journal-entries/${entry.id}/void`);
      toast.success("Journal entry voided successfully");
      // Refresh
      const res: any = await api.get(`/journal-entries/${entry.id}`);
      setEntry(res.data || res);
    } catch (err: any) {
      toast.error(err.message || "Failed to void entry");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="p-6 space-y-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Journal Entries
        </Button>
        <p className="text-muted-foreground">Journal entry not found.</p>
      </div>
    );
  }

  const isBalanced =
    Math.abs((entry.totalDebit || 0) - (entry.totalCredit || 0)) < 0.01;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              Entry #{entry.entryNumber || entry.id.slice(0, 8)}
            </h1>
            <Badge
              className={cn(
                "capitalize border-0",
                statusStyles[entry.status] || "bg-gray-100 text-gray-800"
              )}
            >
              {entry.status}
            </Badge>
          </div>
        </div>
        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {entry.status === "draft" && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!!actionLoading}
              onClick={handlePost}
            >
              {actionLoading === "post" ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Post Entry
            </Button>
          )}
          {entry.status === "posted" && (
            <Button
              size="sm"
              variant="destructive"
              disabled={!!actionLoading}
              onClick={handleVoid}
            >
              {actionLoading === "void" ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Ban className="h-4 w-4 mr-1" />
              )}
              Void Entry
            </Button>
          )}
        </div>
      </div>
      <Separator />

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Entry Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Entry Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Entry Number</span>
              <span className="text-sm font-medium">
                {entry.entryNumber || entry.id.slice(0, 8)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Date</span>
              <span className="text-sm font-medium">
                {formatDate(entry.entryDate, "long")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Description</span>
              <span className="text-sm font-medium text-right max-w-[200px]">
                {entry.description || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className="text-sm font-medium capitalize">
                Manual Entry
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Debit</span>
              <span className="text-sm font-bold text-emerald-600">
                {formatCurrency(entry.totalDebit || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Credit</span>
              <span className="text-sm font-bold text-blue-600">
                {formatCurrency(entry.totalCredit || 0)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge
                variant="outline"
                className={
                  isBalanced
                    ? "border-emerald-600 text-emerald-600"
                    : "border-red-600 text-red-600"
                }
              >
                {isBalanced ? "Balanced" : "Unbalanced"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(entry.lineItems || []).map((line, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <span className="font-medium">
                          {getAccountDisplay(line).name}
                        </span>
                        {getAccountDisplay(line).code && (
                          <p className="text-xs text-muted-foreground font-mono">
                            {getAccountDisplay(line).code}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {line.description || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {line.debit > 0 ? (
                        <span className="text-emerald-600">
                          {formatCurrency(line.debit)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {line.credit > 0 ? (
                        <span className="text-blue-600">
                          {formatCurrency(line.credit)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={2} className="text-right">
                    Total
                  </TableCell>
                  <TableCell className="text-right text-emerald-600">
                    {formatCurrency(entry.totalDebit || 0)}
                  </TableCell>
                  <TableCell className="text-right text-blue-600">
                    {formatCurrency(entry.totalCredit || 0)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {entry.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {entry.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
