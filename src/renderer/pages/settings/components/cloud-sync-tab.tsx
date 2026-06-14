/**
 * Cloud Sync Settings Tab
 * Connect to SyncBooks cloud for bidirectional data sync.
 * After connecting, automatically updates user session with cloud org ID.
 */

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useSync } from "@/contexts/sync-context";
import { useLicense } from "@/contexts/license-context";
import { api } from "@/lib/api-client";
import { connectToCloud, initialSync, disconnectCloud } from "@/lib/cloud-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Cloud, Database, Shield, RefreshCw, Unplug, Download, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export function CloudSyncTab() {
  const { user, login } = useAuth();
  const { status, isOnline } = useSync();
  const { refresh: refreshLicense } = useLicense();

  const [cloudUrl, setCloudUrl] = useState("http://localhost:5000");
  const [cloudEmail, setCloudEmail] = useState("");
  const [cloudPassword, setCloudPassword] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [connectSuccess, setConnectSuccess] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState("");

  const handleConnectCloud = async () => {
    if (!cloudUrl || !cloudEmail || !cloudPassword) {
      setConnectError("All fields are required");
      return;
    }
    setConnecting(true);
    setConnectError("");
    setConnectSuccess("");
    setSyncResult("");

    try {
      // Step 1: Authenticate with cloud
      const authResult = await connectToCloud({ cloudApiUrl: cloudUrl, email: cloudEmail, password: cloudPassword });
      if (!authResult.success) {
        setConnectError(authResult.error || "Connection failed");
        setConnecting(false);
        return;
      }

      setConnectSuccess("Connected! Downloading data...");
      setSyncing(true);

      // Step 2: Pull all data from cloud
      const syncRes = await initialSync();
      if (!syncRes.success) {
        setSyncResult(`Sync error: ${syncRes.error}`);
        setSyncing(false);
        setConnecting(false);
        return;
      }

      setSyncResult(`Downloaded ${syncRes.totalRecords} records.`);

      // Step 3: Update local user to use the cloud org ID and re-issue token
      // This is the key step - it aligns the local session with the synced data
      try {
        const setupResult: any = await api.post("/auth/setup-cloud-user", {
          email: cloudEmail,
          password: cloudPassword,
        });

        if (setupResult.token) {
          // Update the session with the new token (has correct cloud org ID)
          api.setToken(setupResult.token);
          // Refresh auth context by re-logging in
          await login(cloudEmail, cloudPassword);
          // Refresh license to pick up cloud plan
          refreshLicense();

          setSyncResult(`Sync complete! ${syncRes.totalRecords} records downloaded. Session updated.`);
          toast.success("Cloud sync connected successfully! Your data is now available.");
        }
      } catch (setupErr: any) {
        // Fallback: try plain login
        try {
          await login(cloudEmail, cloudPassword);
          refreshLicense();
          setSyncResult(`Sync complete! ${syncRes.totalRecords} records downloaded.`);
          toast.success("Cloud connected and data synced!");
        } catch {
          setSyncResult(`Data synced (${syncRes.totalRecords} records) but session update failed. Please log out and log back in.`);
        }
      }

      setCloudPassword("");
    } catch (err: any) {
      setConnectError(err.message || "Connection failed");
    } finally {
      setConnecting(false);
      setSyncing(false);
    }
  };

  const handleDisconnect = () => {
    disconnectCloud();
    setConnectSuccess("");
    setSyncResult("");
    toast.success("Disconnected from cloud");
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncResult("");
    try {
      const syncRes = await initialSync();
      if (syncRes.success) {
        setSyncResult(`Sync complete: ${syncRes.totalRecords} records`);
        // Re-align session
        try {
          const me: any = await api.get("/auth/me");
          // Session already has correct org, just refresh
        } catch {}
        refreshLicense();
        toast.success("Sync complete!");
      } else {
        setSyncResult(`Sync failed: ${syncRes.error}`);
      }
    } catch (err: any) {
      setSyncResult(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-xs text-muted-foreground">Local Database</p>
                <p className="text-sm font-medium">SQLite (WAL)</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Pending: {status.pendingChanges} changes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <Cloud className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Network</p>
                <Badge className={isOnline ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                  {isOnline ? "Online" : "Offline"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-xs text-muted-foreground">Account</p>
                <p className="text-sm font-medium">{user?.fullName || "Local"}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 capitalize">{user?.role || "owner"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Status</CardTitle>
          <CardDescription>Current synchronization state with cloud</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cloud Connection</span>
            <span className={status.connected ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
              {status.connected ? "✓ Connected" : "Not connected"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Synced</span>
            <span>{status.lastSyncedAt ? new Date(status.lastSyncedAt).toLocaleString() : "Never"}</span>
          </div>
          {status.lastError && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Error</span>
              <span className="text-red-500 text-xs max-w-[200px] truncate">{status.lastError}</span>
            </div>
          )}
          {status.connected && (
            <Button onClick={handleManualSync} disabled={syncing} className="w-full mt-3">
              {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {syncing ? "Syncing..." : "Sync Now"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Cloud Connection Config */}
      <Card>
        <CardHeader>
          <CardTitle>Cloud Sync Configuration</CardTitle>
          <CardDescription>
            Connect to your SyncBooks cloud account. All data works offline; sync happens when connected.
            After connecting, your local data will be replaced with cloud data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-sm text-emerald-700">Connected to cloud</span>
              </div>
              {syncResult && <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">{syncResult}</div>}
              <div className="flex gap-3">
                <Button onClick={handleManualSync} disabled={syncing}>
                  {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  {syncing ? "Syncing..." : "Full Sync"}
                </Button>
                <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={handleDisconnect}>
                  <Unplug className="h-4 w-4 mr-2" /> Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {connectError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600">{connectError}</span>
                </div>
              )}
              {connectSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm text-emerald-700">{connectSuccess}</span>
                </div>
              )}
              {syncResult && <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">{syncResult}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cloud Server URL</Label>
                  <Input value={cloudUrl} onChange={(e) => setCloudUrl(e.target.value)} placeholder="http://localhost:5000" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={cloudEmail} onChange={(e) => setCloudEmail(e.target.value)} placeholder="you@company.com" />
                </div>
              </div>
              <div className="max-w-sm space-y-2">
                <Label>Password</Label>
                <Input type="password" value={cloudPassword} onChange={(e) => setCloudPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <Button onClick={handleConnectCloud} disabled={connecting || syncing}>
                {connecting || syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Cloud className="h-4 w-4 mr-2" />}
                {connecting ? "Connecting..." : syncing ? "Downloading data..." : "Connect & Sync"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
