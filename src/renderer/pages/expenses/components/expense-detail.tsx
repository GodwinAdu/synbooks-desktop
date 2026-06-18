import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle, DollarSign, XCircle, Loader2 } from "lucide-react";

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

interface Props {
  expenseId: string;
  onBack: () => void;
}

export function ExpenseDetail({ expenseId, onBack }: Props) {
  const [expense, setExpense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchExpense = async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/expenses/${expenseId}`);
      setExpense(res.data || res);
    } catch { toast.error("Failed to load expense"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchExpense(); }, [expenseId]);

  const handleAction = async (action: string, endpoint: string) => {
    setActionLoading(action);
    try {
      await api.post(`/expenses/${expenseId}/${endpoint}`);
      toast.success(`Expense ${action}`);
      fetchExpense();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setActionLoading(null); }
  };

  if (loading) return <div className="p-6 space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!expense) return <div className="p-6"><Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button><p className="text-muted-foreground mt-4">Not found.</p></div>;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{expense.expenseNumber}</h1>
              <Badge className={statusStyles[expense.status] || ""}>{expense.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{expense.vendorName || expense.description || "No description"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {expense.status === "pending" && (
            <>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAction("approved", "approve")} disabled={!!actionLoading}>
                {actionLoading === "approved" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />} Approve
              </Button>
              <Button size="sm" variant="outline" className="text-red-600 border-red-200" onClick={() => handleAction("rejected", "reject")} disabled={!!actionLoading}>
                {actionLoading === "rejected" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />} Reject
              </Button>
            </>
          )}
          {expense.status === "approved" && (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAction("marked as paid", "mark-paid")} disabled={!!actionLoading}>
              {actionLoading === "marked as paid" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <DollarSign className="h-4 w-4 mr-1" />} Mark as Paid
            </Button>
          )}
        </div>
      </div>
      <Separator />

      <Card className="border-2 border-red-200 dark:border-red-800">
        <CardContent className="pt-8 pb-8 text-center">
          <p className="text-sm text-muted-foreground uppercase">Expense Amount</p>
          <p className="text-4xl font-bold text-red-600 mt-2">{formatCurrency(expense.amount)}</p>
          {(expense.taxAmount || 0) > 0 && <p className="text-sm text-muted-foreground mt-1">Tax: {formatCurrency(expense.taxAmount)}</p>}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Expense #</span><span className="font-mono">{expense.expenseNumber}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{formatDate(expense.date)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Vendor</span><span>{expense.vendorName || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span>{expense.category || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payment Method</span><span className="capitalize">{(expense.paymentMethod || "cash").replace(/_/g, " ")}</span></div>
            {expense.referenceNumber && <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-mono">{expense.referenceNumber}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Reimbursable</span><span>{expense.isReimbursable ? "Yes" : "No"}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Current Status</span><Badge className={statusStyles[expense.status] || ""}>{expense.status}</Badge></div>
            {expense.approvedBy && <div className="flex justify-between"><span className="text-muted-foreground">Approved At</span><span>{formatDate(expense.approvedAt)}</span></div>}
            {expense.rejectedAt && <div className="flex justify-between"><span className="text-muted-foreground">Rejected At</span><span>{formatDate(expense.rejectedAt)}</span></div>}
            {expense.rejectionReason && <div className="flex justify-between"><span className="text-muted-foreground">Rejection Reason</span><span>{expense.rejectionReason}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{formatDate(expense.createdAt)}</span></div>
          </CardContent>
        </Card>
      </div>

      {(expense.description || expense.notes) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            {expense.description && <p className="text-sm text-muted-foreground">{expense.description}</p>}
            {expense.notes && <p className="text-sm text-muted-foreground mt-2">{expense.notes}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
