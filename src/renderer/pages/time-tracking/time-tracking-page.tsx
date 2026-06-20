/**
 * Time Tracking Page
 * Simple time entry form with local state.
 * Tracks hours, auto-calculates duration, shows weekly summary.
 */

import { useState, useMemo, useEffect } from "react";
import { api } from "@/lib/api-client";
import { Heading } from "@/components/commons/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Clock, Plus, Trash2, Timer, AlertTriangle } from "lucide-react";

interface TimeEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockIn: string;
  clockOut: string;
  hours: number;
  notes: string;
}

function calculateHours(clockIn: string, clockOut: string): number {
  if (!clockIn || !clockOut) return 0;
  const [inH, inM] = clockIn.split(":").map(Number);
  const [outH, outM] = clockOut.split(":").map(Number);
  const diff = (outH * 60 + outM - (inH * 60 + inM)) / 60;
  return Math.max(0, Math.round(diff * 100) / 100);
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export function TimeTrackingPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Form state
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [clockIn, setClockIn] = useState("08:00");
  const [clockOut, setClockOut] = useState("17:00");
  const [notes, setNotes] = useState("");

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
    // Load persisted time entries
    api
      .get("/time-leave/time-entries", { pageSize: 200 })
      .then((res: any) => setEntries(res.data || []))
      .catch(console.error);
  }, []);

  const hours = useMemo(
    () => calculateHours(clockIn, clockOut),
    [clockIn, clockOut]
  );

  const handleAdd = async () => {
    if (!employeeId) {
      toast.error("Please select an employee");
      return;
    }
    if (!date) {
      toast.error("Please select a date");
      return;
    }
    if (hours <= 0) {
      toast.error("Invalid time range");
      return;
    }

    const emp = employees.find((e) => e.id === employeeId);
    const name =
      emp?.name || `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim() || "Unknown";

    try {
      const result: any = await api.post("/time-leave/time-entries", {
        employeeId,
        employeeName: name,
        date,
        clockIn,
        clockOut,
        hours,
        notes,
      });
      const entry = result.data || { id: Date.now().toString(), employeeId, employeeName: name, date, clockIn, clockOut, hours, notes };
      setEntries([entry, ...entries]);
      setNotes("");
      toast.success("Time entry added");
    } catch (e: any) {
      toast.error(e.message || "Failed to save time entry");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/time-leave/time-entries/${id}`);
      setEntries(entries.filter((e) => e.id !== id));
      toast.success("Entry removed");
    } catch {
      setEntries(entries.filter((e) => e.id !== id));
    }
  };

  // Weekly summary
  const weekStart = getWeekStart(new Date());
  const weeklyHours = useMemo(() => {
    return entries
      .filter((e) => e.date >= weekStart)
      .reduce((sum, e) => sum + e.hours, 0);
  }, [entries, weekStart]);

  const overtimeHours = Math.max(0, weeklyHours - 40);

  const columns: ColumnDef<TimeEntry>[] = [
    {
      accessorKey: "employeeName",
      header: "Employee",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.employeeName}</span>
      ),
    },
    {
      accessorKey: "date",
      header: "Date",
    },
    {
      accessorKey: "clockIn",
      header: "Clock In",
    },
    {
      accessorKey: "clockOut",
      header: "Clock Out",
    },
    {
      accessorKey: "hours",
      header: "Hours",
      cell: ({ row }) => (
        <span className="font-mono font-medium">
          {row.original.hours.toFixed(2)}h
        </span>
      ),
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs truncate max-w-[200px] block">
          {row.original.notes || "—"}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-500"
          onClick={() => handleDelete(row.original.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <Heading
        title="Time Tracking"
        description="Track employee working hours and attendance"
      />
      <Separator />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Timer className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Entries</p>
                <p className="text-2xl font-bold">{entries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Hours This Week
                </p>
                <p className="text-2xl font-bold">{weeklyHours.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Overtime (&gt;40h/week)
                </p>
                <p className="text-2xl font-bold">
                  {overtimeHours.toFixed(1)}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Time Entry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div className="space-y-2 md:col-span-2">
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
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Clock In</Label>
              <Input
                type="time"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Clock Out</Label>
              <Input
                type="time"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Hours</Label>
              <div className="h-9 flex items-center px-3 bg-muted rounded-md">
                <span className="font-mono font-medium">
                  {hours.toFixed(2)}h
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Worked on project X"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <Button
              onClick={handleAdd}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Entry
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={entries}
            searchKey="employeeName"
            searchPlaceholder="Search entries..."
            pageSize={15}
            emptyMessage="No time entries yet. Add one above."
            emptyIcon={
              <Clock className="size-10 text-muted-foreground/50 mb-2" />
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
