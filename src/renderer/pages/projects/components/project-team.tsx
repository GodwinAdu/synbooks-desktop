/**
 * Project Team Members Tab
 * Add/remove team members with roles and hourly rates.
 * Matches the Next.js project team member management.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Plus, Trash2, UserPlus, Users, User } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface TeamMember {
  id: string;
  userId: string;
  userName: string;
  role: string;
  hourlyRate: number;
  joinedDate: string;
  isActive: boolean;
}

interface ProjectTeamProps {
  projectId: string;
  managerId?: string;
}

const ROLES = [
  { value: "manager", label: "Manager" },
  { value: "member", label: "Member" },
  { value: "viewer", label: "Viewer" },
  { value: "contractor", label: "Contractor" },
];

const ROLE_COLORS: Record<string, string> = {
  manager: "bg-purple-100 text-purple-700",
  member: "bg-blue-100 text-blue-700",
  viewer: "bg-gray-100 text-gray-700",
  contractor: "bg-amber-100 text-amber-700",
};

export function ProjectTeam({ projectId, managerId }: ProjectTeamProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [selectedUserId, setSelectedUserId] = useState("");
  const [role, setRole] = useState("member");
  const [hourlyRate, setHourlyRate] = useState("");

  const fetchMembers = () => {
    setLoading(true);
    api.get(`/projects/${projectId}/team`)
      .then((res: any) => setMembers(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchUsers = () => {
    api.get("/users")
      .then((res: any) => setUsers(res.users || []))
      .catch(() => {});
  };

  useEffect(() => { fetchMembers(); }, [projectId]);

  const openAddDialog = () => {
    setSelectedUserId("");
    setRole("member");
    setHourlyRate("");
    fetchUsers();
    setShowAdd(true);
  };

  const handleAdd = async () => {
    if (!selectedUserId) { toast.error("Please select a user"); return; }
    setSubmitting(true);
    try {
      const user = users.find((u) => u.id === selectedUserId);
      await api.post(`/projects/${projectId}/team`, {
        userId: selectedUserId,
        userName: user?.fullName || user?.email || "Unknown",
        role,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : 0,
      });
      toast.success("Team member added");
      setShowAdd(false);
      fetchMembers();
    } catch (e: any) {
      toast.error(e.message || "Failed to add member");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (memberId: string, memberName: string) => {
    try {
      await api.delete(`/projects/${projectId}/team/${memberId}`);
      toast.success(`${memberName} removed from team`);
      fetchMembers();
    } catch (e: any) {
      toast.error(e.message || "Failed to remove member");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Team Members ({members.length})</span>
        </div>
        <Button size="sm" onClick={openAddDialog}>
          <UserPlus className="h-4 w-4 mr-1" /> Add Member
        </Button>
      </div>

      {/* Members List */}
      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Users className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-3" />
              <p className="text-sm text-muted-foreground">No team members yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add team members to assign tasks and track hours</p>
              <Button size="sm" className="mt-3" onClick={openAddDialog}>
                <UserPlus className="h-4 w-4 mr-1" /> Add First Member
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <Card key={member.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {(member.userName || "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{member.userName || "Unknown User"}</p>
                        <Badge className={`text-[10px] ${ROLE_COLORS[member.role] || "bg-gray-100 text-gray-700"}`}>
                          {member.role}
                        </Badge>
                        {member.userId === managerId && (
                          <Badge className="text-[10px] bg-emerald-100 text-emerald-700">PM</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(member.joinedDate).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}
                        {member.hourlyRate > 0 && ` • ${formatCurrency(member.hourlyRate)}/hr`}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                    onClick={() => handleRemove(member.id, member.userName)}
                    disabled={member.userId === managerId}
                    title={member.userId === managerId ? "Cannot remove project manager" : "Remove from team"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User *</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hourly Rate (GHS)</Label>
              <Input
                type="number"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="0.00 (optional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={submitting || !selectedUserId}>
              {submitting ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
