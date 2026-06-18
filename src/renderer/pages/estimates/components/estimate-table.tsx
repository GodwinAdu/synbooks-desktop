import { useState } from "react";
import { DataTable } from "@/components/table";
import { Calculator } from "lucide-react";
import { getEstimateColumns } from "./estimate-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import type { Estimate } from "../types";

interface Props {
  estimates: Estimate[];
  loading: boolean;
  onRefresh: () => void;
  onView?: (estimate: Estimate) => void;
}

export function EstimateTable({ estimates, loading, onRefresh, onView }: Props) {
  const [convertingEstimate, setConvertingEstimate] = useState<Estimate | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const columns = getEstimateColumns({
    onView: (est) => onView?.(est),
    onSend: async (est) => {
      try {
        await api.post(`/estimates/${est.id}/send`);
        toast.success("Estimate marked as sent");
        onRefresh();
      } catch (e: any) { toast.error(e.message || "Failed"); }
    },
    onAccept: async (est) => {
      try {
        await api.post(`/estimates/${est.id}/accept`);
        toast.success("Estimate accepted");
        onRefresh();
      } catch (e: any) { toast.error(e.message || "Failed"); }
    },
    onDecline: async (est) => {
      try {
        await api.post(`/estimates/${est.id}/decline`);
        toast.success("Estimate declined");
        onRefresh();
      } catch (e: any) { toast.error(e.message || "Failed"); }
    },
    onConvert: (est) => setConvertingEstimate(est),
    onDelete: async (est) => {
      if (!confirm(`Delete estimate ${est.estimateNumber}?`)) return;
      try {
        await api.delete(`/estimates/${est.id}`);
        toast.success("Estimate deleted");
        onRefresh();
      } catch (e: any) { toast.error(e.message || "Failed"); }
    },
  });

  return (
    <>
      <DataTable
        columns={columns}
        data={estimates}
        searchKey="estimateNumber"
        searchPlaceholder="Search estimates by number..."
        pageSize={20}
        emptyMessage="No estimates found. Create your first estimate to get started."
        emptyIcon={<Calculator className="size-10 text-muted-foreground/50 mb-2" />}
      />
      {convertingEstimate && (
        <ConvertToInvoiceDialog
          estimate={convertingEstimate}
          onClose={() => setConvertingEstimate(null)}
          onSuccess={() => { setConvertingEstimate(null); onRefresh(); }}
        />
      )}
    </>
  );
}

function ConvertToInvoiceDialog({ estimate, onClose, onSuccess }: { estimate: Estimate; onClose: () => void; onSuccess: () => void }) {
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConvert = async () => {
    if (!dueDate) { toast.error("Please select a due date"); return; }
    setLoading(true);
    try {
      await api.post(`/estimates/${estimate.id}/convert`, { dueDate });
      toast.success("Estimate converted to draft invoice! Check the Invoices page.");
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Failed to convert");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convert to Invoice</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Converting <span className="font-medium text-foreground">{estimate.estimateNumber}</span> will create a new draft invoice with all line items copied over.
          </p>
          <div className="space-y-2">
            <Label>Invoice Due Date *</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleConvert} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
            {loading ? "Converting..." : "Convert to Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
