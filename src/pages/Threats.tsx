import { MainLayout } from "@/components/layout/MainLayout";
import { ThreatsList } from "@/components/dashboard/ThreatsList";
import { StatCard } from "@/components/ui/stat-card";
import { ShieldAlert, Shield, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useEndpointThreats } from "@/hooks/useDashboardData";
import { useMemo } from "react";
import { subDays, isAfter } from "date-fns";

const Threats = () => {
  const { data: threats, isLoading } = useEndpointThreats();

  const stats = useMemo(() => {
    if (!threats) {
      return { active: 0, investigating: 0, blockedToday: 0, resolved7d: 0 };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = subDays(now, 7);

    const active = threats.filter(t => 
      ["active", "executing", "allowed"].includes(t.status.toLowerCase())
    ).length;

    const investigating = threats.filter(t => 
      ["quarantined", "unknown"].includes(t.status.toLowerCase())
    ).length;

    const blockedToday = threats.filter(t => {
      const date = new Date(t.created_at);
      return isAfter(date, today) && 
        ["blocked", "removed"].includes(t.status.toLowerCase());
    }).length;

    const resolved7d = threats.filter(t => {
      const date = new Date(t.last_threat_status_change_time || t.created_at);
      return isAfter(date, sevenDaysAgo) && 
        ["resolved", "removed", "blocked"].includes(t.status.toLowerCase());
    }).length;

    return { active, investigating, blockedToday, resolved7d };
  }, [threats]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Threat Detection
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor and respond to security threats across your endpoints
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Active Threats"
            value={stats.active}
            icon={ShieldAlert}
            variant={stats.active > 0 ? "danger" : "default"}
          />
          <StatCard
            title="Investigating"
            value={stats.investigating}
            icon={AlertTriangle}
            variant={stats.investigating > 0 ? "warning" : "default"}
          />
          <StatCard
            title="Blocked Today"
            value={stats.blockedToday}
            icon={Shield}
            variant="success"
          />
          <StatCard
            title="Resolved (7d)"
            value={stats.resolved7d}
            icon={CheckCircle}
          />
        </div>

        <ThreatsList limit={50} showHeaderLink={false} enableResolveActions />
      </div>
    </MainLayout>
  );
};

export default Threats;
