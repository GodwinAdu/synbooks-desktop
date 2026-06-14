/**
 * Login Page
 * Two modes:
 * 1. Local login (for returning desktop users)
 * 2. Cloud connect (for first-time users who have an existing cloud account)
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api-client";
import { connectToCloud, initialSync } from "@/lib/cloud-client";
import { Cloud, Monitor, Loader2 } from "lucide-react";

type Mode = "local" | "cloud";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("local");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cloudUrl, setCloudUrl] = useState("http://localhost:5000");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState("");

  // Local login (existing desktop user)
  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Cloud connect (existing cloud user, first time on desktop)
  const handleCloudConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setSyncProgress("Connecting to cloud...");

    try {
      // Clear any existing session
      api.setToken(null);

      // Step 1: Authenticate with cloud backend & sync data
      setSyncProgress("Authenticating with cloud server...");
      const authResult = await connectToCloud({ cloudApiUrl: cloudUrl, email, password });

      if (!authResult.success) {
        setError(authResult.error || "Cloud authentication failed");
        setLoading(false);
        setSyncProgress("");
        return;
      }

      // Step 2: Download all data from cloud
      setSyncProgress("Downloading your organization data...");
      const syncResult = await initialSync();

      if (!syncResult.success) {
        setSyncProgress("");
        setError(`Sync failed: ${syncResult.error}`);
        setLoading(false);
        return;
      }

      setSyncProgress(`Downloaded ${syncResult.totalRecords} records. Logging in...`);

      // Step 3: Setup local access and get token directly
      const setupResult: any = await api.post("/auth/setup-cloud-user", { email, password });
      
      if (setupResult.token) {
        // Use the token directly — don't call login() again
        api.setToken(setupResult.token);
        navigate("/");
      } else {
        setError("Setup completed but no token returned. Try Local Login.");
      }
    } catch (err: any) {
      setError(err.message || "Connection failed. Check the server URL and try again.");
    } finally {
      setLoading(false);
      setSyncProgress("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-12 rounded-xl bg-primary mb-3">
            <span className="text-primary-foreground text-lg font-bold">S</span>
          </div>
          <h1 className="text-2xl font-bold">SyncBooks Desktop</h1>
          <p className="text-muted-foreground text-sm mt-1">Works offline. Syncs when connected.</p>
        </div>

        {/* Mode Switcher */}
        <div className="flex rounded-lg border border-border p-1 mb-6 bg-muted/50">
          <button
            onClick={() => setMode("local")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              mode === "local" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Monitor className="size-4" /> Local Login
          </button>
          <button
            onClick={() => setMode("cloud")}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              mode === "cloud" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Cloud className="size-4" /> Connect to Cloud
          </button>
        </div>

        {/* Form Card */}
        <div className="bg-card rounded-xl border shadow-sm p-6">
          {mode === "cloud" && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>For existing SyncBooks users:</strong> Enter your cloud account credentials to download your data and use it offline.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}

          {syncProgress && (
            <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm text-primary flex items-center gap-2">
              <Loader2 className="size-4 animate-spin shrink-0" />
              {syncProgress}
            </div>
          )}

          <form onSubmit={mode === "local" ? handleLocalLogin : handleCloudConnect} className="space-y-4">
            {/* Cloud URL (only for cloud mode) */}
            {mode === "cloud" && (
              <div>
                <label className="block text-sm font-medium mb-1">Server URL</label>
                <input
                  type="url"
                  value={cloudUrl}
                  onChange={(e) => setCloudUrl(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  placeholder="https://syncbooksapp.com"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Your SyncBooks cloud server address</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-transparent text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-primary text-primary-foreground rounded-md font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : mode === "cloud" ? (
                <Cloud className="size-4" />
              ) : (
                <Monitor className="size-4" />
              )}
              {loading
                ? mode === "cloud" ? "Connecting..." : "Signing in..."
                : mode === "cloud" ? "Connect & Download Data" : "Sign In"
              }
            </button>
          </form>

          {mode === "local" && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              New to desktop? <Link to="/register" className="text-primary hover:underline">Create offline account</Link>
              {" "}or switch to <button onClick={() => setMode("cloud")} className="text-primary hover:underline">Cloud Connect</button>
            </p>
          )}

          {mode === "cloud" && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already set up locally? <button onClick={() => setMode("local")} className="text-primary hover:underline">Local Login</button>
            </p>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          All data stored locally on your device. Encrypted at rest.
        </p>
      </div>
    </div>
  );
}
