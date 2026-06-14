import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { POSSale } from "../types";
import { formatCurrency } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Receipt, Search } from "lucide-react";

export function SalesHistory() {
  const [sales, setSales] = useState<POSSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/pos/sales")
      .then((data: any) => {
        setSales(data?.data || data || []);
      })
      .catch(() => setSales([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = sales.filter(
    (s) =>
      !search ||
      s.saleNumber.toLowerCase().includes(search.toLowerCase()) ||
      (s.customerName && s.customerName.toLowerCase().includes(search.toLowerCase()))
  );

  const paymentBadgeVariant = (method: string) => {
    switch (method) {
      case "cash": return "default";
      case "card": return "secondary";
      case "mobile_money": return "outline";
      default: return "outline";
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by sale number or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Receipt className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No sales found</p>
          <p className="text-xs">Sales will appear here after checkout.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sale #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-mono text-xs">{sale.saleNumber}</TableCell>
                  <TableCell className="text-xs">
                    {new Date(sale.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-xs">
                    {sale.customerName || <span className="text-muted-foreground">Walk-in</span>}
                  </TableCell>
                  <TableCell className="text-center text-xs">
                    {sale.lineItems?.length || 0}
                  </TableCell>
                  <TableCell className="text-right font-bold text-xs">
                    {formatCurrency(sale.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={paymentBadgeVariant(sale.paymentMethod) as any} className="text-[10px] capitalize">
                      {sale.paymentMethod.replace("_", " ")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
