/**
 * Leave Management Page
 * Leave request form, table with status badges, approve/reject workflow.
 */

import { useState, useMemo, useEffect } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/table";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  Calendar,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  CalendarDays,
} from "lucide-react";

interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

const leaveTypeLabels: Record<string, string> = {
  annual: "Annual Leave",
  sick: "Sick Leave",
  maternity: "Maternity Leave",
  paternity: "Paternity Leave",
  unpaid: "Unpaid Leave",
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

function calculateDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.ceil(
    (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.max(0, diff + 1); // inclusive
}

export function LeaveManagementPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Form state
  const [employeeId, setEmployeeId] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    api
      .get("/employees", { pageSize: 200 })
      .then((res: any) => {
        const active = (res.data || []).filter(
          (e: any) => e.status === "active"
        );
        setEmployees(active);
      })
      .catch(console.error);
  }, []);

  const days = useMemo(
    () => calculateDays(startDate, endDate),
    [startDate, endDate]
  );

  const handleSubmit = () => {
    if (!employeeId) {
      toast.error("Please select an employee");
      return;
    }
    if (!leaveType) {
      toast.error("Please select a leave type");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Please select start and end dates");
      return;
    }
    if (days <= 0) {
      toast.error("End date must be after start date");
      return;
    }

    const emp = employees.find((e) => e.id === employeeId);
    const name =
      emp?.name || `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim() || "Unknown";

    const request: LeaveRequest = {
      id: Date.now().toString(),
      employeeId,
      employeeName: name,
      leaveType,
      startDate,
      endDate,
      days,
      reason,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    setRequests([request, ...requests]);
    setReason("");
    setStartDate("");
    setEndDate("");
    toast.success("Leave request submitted");
  };

  const handleApprove = (id: string) => {
    setRequests(
      requests.map((r) => (r.id === id ? { ...r, status: "approved" } : r))
    );
    toast.success("Leave request approved");
  };

  const handleReject = (id: string) => {
    setRequests(
      requests.map((r) => (r.id === id ? { ...r, status: "rejected" } : r))
    );
    toast.success("Leave request rejected");
  };

  // Summary calculations
  const currentMonth = new Date().toISOString().slice(0, 7);
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedThisMonth = requests.filter(
    (r) =>
      r.status === "approved" && r.createdAt.startsWith(currentMonth)
  ).length;
  const totalDaysUsed = requests
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => sum + r.days, 0);

  const columns: ColumnDef<LeaveRequest>[] = [
    {
      accessorKey: "employeeName",
      header: "Employee",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.employeeName}</span>
      ),
    },
    {
      accessorKey: "leaveType",
      header: "Type",
      cell: ({ row }) => (
        <span>{leaveTypeLabels[row.original.leaveType] || row.original.leaveType}</span>
      ),
    },
    {
      accessorKey: "startDate",
      header: "Start",
    },
    {
      accessorKey: "endDate",
      header: "End",
    },
    {
      accessorKey: "days",
      header: "Days",
      cell: ({ row }) => (
        <span className="font-mono">{row.original.days}</span>
      ),
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground truncate max-w-[150px] block">
          {row.original.reason || "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const cfg = statusConfig[row.original.status];
        return <Badge className={cfg.className}>{cfg.label}</Badge>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        if (row.original.status !== "pending") return null;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-600 hover:text-emerald-700"
              onClick={() => handleApprove(row.original.id)}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={() => handleReject(row.original.id)}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <Heading
        title="Leave Management"
        description="Manage employee leave requests and approvals"
      />
      <Separator />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Pending Requests
                </p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Approved This Month
                </p>
                <p className="text-2xl font-bold">{approvedThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Days Used
                </p>
                <p className="text-2xl font-bold">{totalDaysUsed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Request Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Leave Request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => {
                    const name =
                      emp.name ||
                      `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
                    return (
                      <SelectItem key={emp.id} value={emp.id}>
                        {name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select value={leaveType} onValueChange={setLeaveType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual Leave</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="maternity">Maternity Leave</SelectItem>
                  <SelectItem value="paternity">Paternity Leave</SelectItem>
                  <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Days</Label>
              <div className="h-9 flex items-center px-3 bg-muted rounded-md">
                <span className="font-mono font-medium">
                  {days} {days === 1 ? "day" : "days"}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for leave..."
                rows={2}
              />
            </div>
            <Button
              onClick={handleSubmit}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Submit Request
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leave Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={requests}
            searchKey="employeeName"
            searchPlaceholder="Search requests..."
            pageSize={15}
            emptyMessage="No leave requests yet. Submit one above."
            emptyIcon={
              <Calendar className="size-10 text-muted-foreground/50 mb-2" />
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
