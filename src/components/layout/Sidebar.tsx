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
  ChevronDown,
  Download,
  ScrollText,
  Building2,
  FolderOpen,
  Sparkles,
  Crosshair,
  Network,
  ClipboardList,
  Router,
  SlidersHorizontal,
  Bell,
  ShieldAlert,
  BookOpen,
  ShieldCheck,
  Cog,
  Eye,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { useUnacknowledgedAlertCount } from "@/hooks/useAlerts";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  requiresNetworkModule?: boolean;
  requiresRouterModule?: boolean;
  requiresLegacyHardening?: boolean;
  badge?: "alerts";
}

interface NavSection {
  label: string;
  icon: any;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Endpoints",
    icon: Monitor,
    items: [
      { name: "Endpoints", href: "/endpoints", icon: Monitor },
      { name: "Groups", href: "/groups", icon: FolderOpen },
    ],
  },
  {
    label: "Security",
    icon: ShieldCheck,
    items: [
      { name: "Alerts", href: "/alerts", icon: Bell, badge: "alerts" as const },
      { name: "Threats", href: "/threats", icon: AlertTriangle },
      { name: "Event Logs", href: "/logs", icon: ScrollText },
      { name: "Threat Hunting", href: "/threat-hunting", icon: Crosshair },
    ],
  },
  {
    label: "Configuration",
    icon: Cog,
    items: [
      { name: "Policies", href: "/policies", icon: FileText },
      { name: "Group Policy", href: "/group-policy", icon: SlidersHorizontal },
    ],
  },
  {
    label: "Infrastructure",
    icon: Network,
    items: [
      { name: "Network", href: "/network", icon: Network, requiresNetworkModule: true },
      { name: "Routers", href: "/routers", icon: Router, requiresRouterModule: true },
    ],
  },
  {
    label: "Compliance",
    icon: Eye,
    items: [
      { name: "Legacy Hardening", href: "/legacy-hardening", icon: ShieldAlert, requiresLegacyHardening: true },
      { name: "Reports", href: "/reports", icon: ClipboardList },
      { name: "AI Advisor", href: "/recommendations", icon: Sparkles },
    ],
  },
  {
    label: "Management",
    icon: Wrench,
    items: [
      { name: "Deploy Agent", href: "/deploy", icon: Download },
      { name: "Activity", href: "/activity", icon: Activity },
      { name: "Users", href: "/users", icon: Users },
      { name: "Settings", href: "/settings", icon: Settings },
      { name: "Help", href: "/help", icon: BookOpen },
    ],
  },
];

const adminNavigation = [
  { name: "Customers", href: "/admin", icon: Building2 },
];

function isItemVisible(item: NavItem, org: any) {
  if (item.requiresNetworkModule && !org?.network_module_enabled) return false;
  if (item.requiresRouterModule && !org?.router_module_enabled) return false;
  if (item.requiresLegacyHardening && !org?.legacy_hardening_enabled) return false;
  return true;
}

export function Sidebar() {
  const location = useLocation();
  const { currentOrganization, isSuperAdmin, isImpersonating, isLoading } = useTenant();
  const { data: alertCount } = useUnacknowledgedAlertCount();
  const [collapsed, setCollapsed] = useState(false);

  // Auto-open sections that contain the active route
  const getInitialOpen = () => {
    const open: Record<string, boolean> = {};
    navSections.forEach((section) => {
      const hasActive = section.items.some(
        (item) => isItemVisible(item, currentOrganization) && location.pathname === item.href
      );
      if (hasActive) open[section.label] = true;
    });
    return open;
  };

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(getInitialOpen);

  const toggleSection = (label: string) => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

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

      {/* Main Navigation - Collapsible Sections */}
      <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
        {!collapsed && isSuperAdmin && (
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Tenant
          </p>
        )}
        {navSections.map((section) => {
          const visibleItems = section.items.filter((item) =>
            isItemVisible(item, currentOrganization)
          );
          if (visibleItems.length === 0) return null;

          const isSectionOpen = openSections[section.label] ?? false;
          const hasActiveItem = visibleItems.some(
            (item) => location.pathname === item.href
          );

          return (
            <div key={section.label}>
              {/* Section header / toggle */}
              {collapsed ? (
                // In collapsed mode, just show section icon as a divider
                <div className="flex items-center justify-center py-2">
                  <section.icon className="h-4 w-4 text-muted-foreground/50" />
                </div>
              ) : (
                <button
                  onClick={() => toggleSection(section.label)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors",
                    hasActiveItem
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <section.icon className="h-3.5 w-3.5" />
                  <span className="flex-1 text-left">{section.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      isSectionOpen && "rotate-180"
                    )}
                  />
                </button>
              )}

              {/* Section items */}
              {(isSectionOpen || collapsed) && (
                <div className={cn("space-y-0.5", !collapsed && "ml-2 border-l border-sidebar-border pl-2 mb-2")}>
                  {visibleItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                          isActive
                            ? "bg-sidebar-accent text-primary"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-4 w-4 flex-shrink-0",
                            isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
                        {!collapsed && <span>{item.name}</span>}
                        {item.badge === "alerts" && !collapsed && alertCount && alertCount > 0 ? (
                          <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">
                            {alertCount > 99 ? "99+" : alertCount}
                          </span>
                        ) : isActive ? (
                          <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
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
