"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

// ---------- Context ----------

interface MonitorContextValue {
  env: "dev" | "prod";
  refreshKey: number;
  lastRefreshed: Date;
}

const MonitorContext = createContext<MonitorContextValue>({
  env: "dev",
  refreshKey: 0,
  lastRefreshed: new Date(),
});

export function useMonitor() {
  return useContext(MonitorContext);
}

// ---------- Nav links ----------

const NAV_LINKS = [
  { href: "/monitor", label: "Overview", icon: LayoutIcon },
  { href: "/monitor/ai", label: "AI & Performance", icon: CpuIcon },
  { href: "/monitor/database", label: "Database Health", icon: DatabaseIcon },
];

// ---------- Shell ----------

export function MonitorShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [env, setEnv] = useState<"dev" | "prod">("dev");
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState<number>(0); // 0 = off, value in seconds
  const [agoText, setAgoText] = useState("just now");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load env from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("monitor-env");
    if (saved === "prod" || saved === "dev") setEnv(saved);
  }, []);

  // Persist env to localStorage
  useEffect(() => {
    localStorage.setItem("monitor-env", env);
  }, [env]);

  // Admin guard
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.replace("/auth/login");
      return;
    }
    if (session.user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [session, status, router]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setLastRefreshed(new Date());
    setAgoText("just now");
  }, []);

  // Auto-refresh interval
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (autoRefresh > 0) {
      intervalRef.current = setInterval(handleRefresh, autoRefresh * 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, handleRefresh]);

  // Update "ago" text every 10s
  useEffect(() => {
    const t = setInterval(() => {
      const diff = Math.floor((Date.now() - lastRefreshed.getTime()) / 1000);
      if (diff < 10) setAgoText("just now");
      else if (diff < 60) setAgoText(`${diff}s ago`);
      else setAgoText(`${Math.floor(diff / 60)}m ago`);
    }, 10_000);
    return () => clearInterval(t);
  }, [lastRefreshed]);

  // Loading / guard states
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>Loading...</p>
      </div>
    );
  }
  if (!session?.user || session.user.role !== "ADMIN") {
    return null;
  }

  return (
    <MonitorContext.Provider value={{ env, refreshKey, lastRefreshed }}>
      <div className="min-h-screen bg-slate-50 flex" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {/* Sidebar */}
        <aside className="w-56 bg-slate-800 text-white flex flex-col flex-shrink-0 min-h-screen">
          <div className="px-5 py-5 border-b border-slate-700">
            <h1 className="text-base font-bold tracking-tight">WriteWhiz Monitor</h1>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-slate-700 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="px-5 py-4 border-t border-slate-700">
            <Link
              href="/dashboard"
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Back to App
            </Link>
          </div>
        </aside>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Production warning banner */}
          {env === "prod" && (
            <div className="bg-amber-400 px-4 py-1.5 text-center text-xs font-bold text-amber-900">
              VIEWING PRODUCTION DATA -- READ ONLY
            </div>
          )}

          {/* Header */}
          <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-4 flex-shrink-0">
            {/* Env toggle */}
            <select
              value={env}
              onChange={(e) => {
                setEnv(e.target.value as "dev" | "prod");
                handleRefresh();
              }}
              className="text-xs font-semibold border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="dev">Dev</option>
              <option value="prod">Prod</option>
            </select>

            {/* Env badge */}
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                env === "prod"
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {env}
            </span>

            <div className="flex-1" />

            {/* Auto-refresh */}
            <select
              value={autoRefresh}
              onChange={(e) => setAutoRefresh(Number(e.target.value))}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value={0}>Auto: Off</option>
              <option value={30}>Auto: 30s</option>
              <option value={60}>Auto: 1m</option>
              <option value={300}>Auto: 5m</option>
            </select>

            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
            >
              <RefreshIcon className="w-3.5 h-3.5" />
              Refresh
            </button>

            {/* Last refreshed */}
            <span className="text-[11px] text-slate-400">{agoText}</span>
          </header>

          {/* Page content */}
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </MonitorContext.Provider>
  );
}

// ---------- Icons (inline SVG) ----------

function LayoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

function CpuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 1v3" /><path d="M15 1v3" /><path d="M9 20v3" /><path d="M15 20v3" />
      <path d="M20 9h3" /><path d="M20 14h3" /><path d="M1 9h3" /><path d="M1 14h3" />
    </svg>
  );
}

function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  );
}
