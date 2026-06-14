/**
 * Activity Feed - Recent activity list with action types
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Edit, Plus, Trash2, CheckCircle, CreditCard, Send, XCircle } from "lucide-react";
import type { Activity } from "../types";

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  create: { label: "created", color: "text-emerald-600", icon: Plus },
  update: { label: "updated", color: "text-blue-600", icon: Edit },
  delete: { label: "deleted", color: "text-red-600", icon: Trash2 },
  approve: { label: "approved", color: "text-emerald-600", icon: CheckCircle },
  reject: { label: "rejected", color: "text-red-600", icon: XCircle },
  mark_paid: { label: "marked as paid", color: "text-emerald-600", icon: CreditCard },
  payment: { label: "recorded payment for", color: "text-emerald-600", icon: CreditCard },
  post: { label: "posted", color: "text-purple-600", icon: Send },
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

interface Props {
  activities: Activity[];
}

export function ActivityFeed({ activities }: Props) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.slice(0, 15).map((activity) => {
            const cfg = ACTION_CONFIG[activity.action] || { label: activity.action, color: "text-muted-foreground", icon: Edit };
            const ActionIcon = cfg.icon;
            return (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="size-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0">
                  {activity.user.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">
                    <span className="font-medium">{activity.user.split(" ")[0]}</span>{" "}
                    <span className={cfg.color}>{cfg.label}</span>{" "}
                    <span className="text-muted-foreground">{activity.resource.replace(/_/g, " ")}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{timeAgo(activity.time)}</p>
                </div>
                <ActionIcon className={`h-3.5 w-3.5 shrink-0 mt-1 ${cfg.color} opacity-50`} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
