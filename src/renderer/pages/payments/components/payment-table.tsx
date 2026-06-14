import { DataTable } from "@/components/table";
import { DollarSign } from "lucide-react";
import { getPaymentColumns } from "./payment-columns";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { PaymentReceived } from "../types";

interface Props {
  payments: PaymentReceived[];
  loading: boolean;
  onRefresh: () => void;
}

export function PaymentTable({ payments, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const columns = getPaymentColumns({
    onView: (payment) => toast.info(`Viewing payment ${payment.paymentNumber}`),
    onRefund: (payment) => toast.info(`Refund initiated for ${payment.paymentNumber}`),
  });

  return (
    <DataTable
      columns={columns}
      data={payments}
      searchKey="paymentNumber"
      searchPlaceholder="Search payments by number..."
      pageSize={20}
      emptyMessage="No payments recorded yet. Payments will appear here once received."
      emptyIcon={<DollarSign className="size-10 text-muted-foreground/50 mb-2" />}
    />
  );
}
