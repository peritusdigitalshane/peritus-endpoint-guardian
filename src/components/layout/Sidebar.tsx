import { cn } from "@/lib/utils";
import {
  Shield,
  LayoutDashboard,
  Monitor,
  AlertTriangle,
  Settings,
  Users,
  FileText,
  Activity,
  ChevronLeft,
  Download,
  ScrollText,
  Building2,
  FolderOpen,
  Sparkles,
  Crosshair,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Endpoints", href: "/endpoints", icon: Monitor },
  { name: "Groups", href: "/groups", icon: FolderOpen },
  { name: "Threats", href: "/threats", icon: AlertTriangle },
  { name: "Event Logs", href: "/logs", icon: ScrollText },
  { name: "Threat Hunting", href: "/threat-hunting", icon: Crosshair },
  { name: "Policies", href: "/policies", icon: FileText },
  { name: "AI Advisor", href: "/recommendations", icon: Sparkles },
  { name: "Deploy Agent", href: "/deploy", icon: Download },
  { name: "Activity", href: "/activity", icon: Activity },
  { name: "Users", href: "/users", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

const adminNavigation = [
  { name: "Customers", href: "/admin", icon: Building2 },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { currentOrganization, isSuperAdmin, isImpersonating, isLoading } = useTenant();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground">Peritus</span>
              <span className="text-xs text-primary">Threat Defence</span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Super Admin Navigation */}
      {isSuperAdmin && (
        <nav className="border-b border-sidebar-border p-3 space-y-1">
          {!collapsed && (
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Admin
            </p>
          )}
          {adminNavigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {!collapsed && <span>{item.name}</span>}
                {isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {!collapsed && isSuperAdmin && (
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Tenant
          </p>
        )}
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-accent text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 flex-shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {!collapsed && <span>{item.name}</span>}
              {isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Tenant selector */}
      {!collapsed && (
        <div className="border-t border-sidebar-border p-3">
          <div className={cn(
            "rounded-lg p-3",
            isImpersonating ? "bg-amber-500/10 border border-amber-500/30" : "bg-sidebar-accent"
          )}>
            <p className="text-xs text-muted-foreground">
              {isImpersonating ? "Viewing Tenant" : "Current Tenant"}
            </p>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <>
                <p className={cn(
                  "text-sm font-medium",
                  isImpersonating ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                )}>
                  {currentOrganization?.name || "No Organization"}
                </p>
                {isImpersonating && (
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                    Super Admin Mode
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
