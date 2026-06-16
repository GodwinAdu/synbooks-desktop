/**
 * Profile Page
 * View and edit user profile. Matches Next.js app layout.
 */

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  Clock,
  Edit,
  Save,
  X,
  Lock,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

export function ProfilePage() {
  const { user, organization } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Edit form state
  const [form, setForm] = useState({
    fullName: user?.fullName || "",
    email: user?.email || "",
    phone: "",
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleEdit = () => {
    setForm({
      fullName: user?.fullName || "",
      email: user?.email || "",
      phone: "",
    });
    setEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!form.fullName.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      await api.put("/auth/profile", {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone || undefined,
      });
      toast.success("Profile updated successfully");
      setEditing(false);
      // Refresh session
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success("Password changed successfully");
      setChangingPassword(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-sm text-muted-foreground">
            Manage your personal information and preferences
          </p>
        </div>
        {!editing && (
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleEdit}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>
      <Separator />

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Picture Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <div className="h-32 w-32 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white text-4xl font-bold border-4 border-emerald-500/20">
              {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold">{user?.fullName}</h3>
              <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Badge className="bg-emerald-600">Active</Badge>
              <Badge variant="outline" className="capitalize">
                {user?.role}
              </Badge>
            </div>
            {organization && (
              <div className="text-center pt-2 border-t w-full">
                <p className="text-xs text-muted-foreground">Organization</p>
                <p className="text-sm font-medium">{organization.name}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personal Information Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              {editing
                ? "Update your account details"
                : "Your account details and contact information"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={form.fullName}
                    onChange={(e) =>
                      setForm({ ...form, fullName: e.target.value })
                    }
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="john@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="+233 24 XXX XXXX"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleSaveProfile}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="h-4 w-4 mr-2" />
                    Full Name
                  </div>
                  <p className="font-medium">{user?.fullName || "—"}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 mr-2" />
                    Email Address
                  </div>
                  <p className="font-medium">{user?.email || "—"}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 mr-2" />
                    Phone Number
                  </div>
                  <p className="font-medium">Not provided</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Shield className="h-4 w-4 mr-2" />
                    Role
                  </div>
                  <p className="font-medium capitalize">{user?.role || "—"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Security & Activity Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Security Card */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your password and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {changingPassword ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                    }
                    placeholder="Enter current password"
                  />
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                    }
                    placeholder="Enter new password (min 6 chars)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                    }
                    placeholder="Confirm new password"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleChangePassword}
                    disabled={savingPassword}
                  >
                    {savingPassword ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4 mr-2" />
                    )}
                    Change Password
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setChangingPassword(false);
                      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                    }}
                    disabled={savingPassword}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Lock className="h-4 w-4 mr-2" />
                      Password
                    </div>
                    <p className="text-sm font-medium">••••••••</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setChangingPassword(true)}
                  >
                    Change
                  </Button>
                </div>
                <Separator />
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Shield className="h-4 w-4 mr-2" />
                    Two-Factor Authentication
                  </div>
                  <p className="text-sm">
                    <Badge variant="outline" className="text-xs">
                      Not available offline
                    </Badge>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Activity Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Activity</CardTitle>
            <CardDescription>Recent account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-2" />
                Current Session
              </div>
              <p className="font-medium">Active now</p>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 mr-2" />
                Account Created
              </div>
              <p className="font-medium">
                {user?.id ? "—" : "Unknown"}
              </p>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Shield className="h-4 w-4 mr-2" />
                Account Status
              </div>
              <Badge className="bg-emerald-600">Active</Badge>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <User className="h-4 w-4 mr-2" />
                Organization
              </div>
              <p className="font-medium">{organization?.name || "—"}</p>
              <p className="text-xs text-muted-foreground">
                Code: {organization?.organizationCode || "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
