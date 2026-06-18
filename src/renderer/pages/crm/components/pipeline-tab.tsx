/**
 * CRM Pipeline Tab
 * Kanban-style view of deals by stage with stage-change buttons.
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { DEAL_STAGES, type Deal } from "../types";
import { FileText } from "lucide-react";

export function PipelineTab() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchDeals = () => {
    setLoading(true);
    api.get("/crm/deals", { pageSize: 200 })
      .then((res: any) => setDeals(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchDeals(); }, []);

  const handleStageChange = async (dealId: string, newStage: string) => {
    try {
      await api.put(`/crm/deals/${dealId}`, { stage: newStage });
      toast.success(`Deal moved to ${DEAL_STAGES.find(s => s.id === newStage)?.label || newStage}`);
      fetchDeals();
    } catch (e: any) {
      toast.error(e.message || "Failed to update deal");
    }
  };

  const handleConvertToInvoice = async (deal: Deal) => {
    try {
      await api.post("/invoices", {
        customerId: deal.contactId || null,
        invoiceDate: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        status: "draft",
        lineItems: [{ name: deal.title, quantity: 1, unitPrice: deal.amount, total: deal.amount, taxRate: 0, taxAmount: 0 }],
        subtotal: deal.amount,
        taxAmount: 0,
        totalAmount: deal.amount,
        notes: `Converted from CRM deal: ${deal.title}`,
      });
      toast.success("Invoice created from deal");
      navigate("/invoices");
    } catch (e: any) {
      toast.error(e.message || "Failed to create invoice");
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
      </div>
    );
  }

  // Group deals by stage
  const stageDeals = DEAL_STAGES.map((stage) => ({
    ...stage,
    deals: deals.filter((d) => d.stage === stage.id),
    total: deals.filter((d) => d.stage === stage.id).reduce((s, d) => s + d.amount, 0),
  }));

  const totalValue = deals.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="space-y-4">
      {/* Pipeline Overview */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base">Pipeline Overview</CardTitle>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {stageDeals.map((stage) => (
              <div key={stage.id} className="text-center">
                <p className="text-xs text-muted-foreground mb-1">{stage.label}</p>
                <p className="text-lg font-bold" style={{ color: stage.color }}>{stage.deals.length}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(stage.total)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 min-h-[400px]">
        {stageDeals.map((stage) => (
          <div key={stage.id} className="flex flex-col">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                <span className="text-xs font-semibold uppercase tracking-wider">{stage.label}</span>
              </div>
              <Badge variant="outline" className="text-[10px]">{stage.deals.length}</Badge>
            </div>

            <div className="flex-1 space-y-2 p-2 rounded-lg bg-muted/30 border border-dashed min-h-[200px]">
              {stage.deals.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No deals</p>
              ) : (
                stage.deals.map((deal) => (
                  <Card key={deal.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-3">
                      <p className="text-sm font-medium truncate">{deal.title}</p>
                      {deal.contactName && (
                        <p className="text-xs text-muted-foreground mt-0.5">{deal.contactName}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-bold" style={{ color: stage.color }}>
                          {formatCurrency(deal.amount)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{deal.probability}%</span>
                      </div>
                      {deal.expectedCloseDate && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Close: {new Date(deal.expectedCloseDate).toLocaleDateString("en-GH", { day: "numeric", month: "short" })}
                        </p>
                      )}

                      {/* Stage change buttons */}
                      <div className="flex gap-1 flex-wrap mt-2 pt-2 border-t">
                        {DEAL_STAGES.filter((s) => s.id !== stage.id).slice(0, 3).map((s) => (
                          <button
                            key={s.id}
                            onClick={() => handleStageChange(deal.id, s.id)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-accent transition-colors"
                          >
                            → {s.label}
                          </button>
                        ))}
                      </div>

                      {/* Convert to Invoice (for won deals) */}
                      {stage.id === "closed_won" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-2 h-7 text-xs text-emerald-600 border-emerald-300"
                          onClick={() => handleConvertToInvoice(deal)}
                        >
                          <FileText className="h-3 w-3 mr-1" /> Convert to Invoice
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
