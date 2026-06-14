/**
 * CRM Pipeline Tab
 * Kanban-style view of deals by stage.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { DEAL_STAGES, type Deal } from "../types";

export function PipelineTab() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/crm/deals", { pageSize: 200 })
      .then((res: any) => setDeals(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="space-y-4">
      {/* Pipeline Summary */}
      <div className="grid grid-cols-5 gap-2">
        {stageDeals.map((stage) => (
          <div key={stage.id} className="text-center p-2 rounded-lg" style={{ backgroundColor: `${stage.color}10` }}>
            <p className="text-xs font-medium text-muted-foreground">{stage.label}</p>
            <p className="text-lg font-bold" style={{ color: stage.color }}>{stage.deals.length}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(stage.total)}</p>
          </div>
        ))}
      </div>

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
                  <Card key={deal.id} className="cursor-pointer hover:shadow-sm transition-shadow">
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
