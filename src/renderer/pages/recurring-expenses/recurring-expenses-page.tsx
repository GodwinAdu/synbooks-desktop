import { useState } from "react";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Repeat, Calendar, DollarSign, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

export function RecurringExpensesPage() {
  const [_expenses] = useState<any[]>([]);

  // Summary data (empty state for now)
  const totalRecurring = 0;
  const activeCount = 0;
  const nextDue = "—";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Heading title="Recurring Expenses" description="Manage auto-generated recurring expenses" />
        <Button onClick={() => toast.info("Coming soon")}>
          <Plus className="h-4 w-4 mr-2" />
          New Recurring Expense
        </Button>
      </div>
      <Separator />

      {/* Info Alert */}
      <Alert className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
        <Info className="h-4 w-4 text-emerald-600" />
        <AlertDescription className="text-emerald-700 dark:text-emerald-300">
          Recurring expenses are auto-created at the scheduled frequency. Set up a recurring expense and it will be automatically recorded on the specified dates.
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Monthly</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalRecurring)}</div>
            <p className="text-xs text-muted-foreground">Estimated monthly outflow</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Active recurring expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Due</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nextDue}</div>
            <p className="text-xs text-muted-foreground">Next expense generation date</p>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Repeat className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">No recurring expenses yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Set up recurring expenses for regular payments like rent, utilities, or subscriptions. They'll be automatically created on schedule.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => toast.info("Coming soon")}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Recurring Expense
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
