import { MainLayout } from "@/components/layout/MainLayout";
import { ThreatsList } from "@/components/dashboard/ThreatsList";
import { StatCard } from "@/components/ui/stat-card";
import { ShieldAlert, Shield, AlertTriangle, CheckCircle } from "lucide-react";

const Threats = () => {
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
            value={2}
            icon={ShieldAlert}
            variant="danger"
          />
          <StatCard
            title="Investigating"
            value={1}
            icon={AlertTriangle}
            variant="warning"
          />
          <StatCard
            title="Blocked Today"
            value={15}
            icon={Shield}
            variant="success"
          />
          <StatCard
            title="Resolved (7d)"
            value={42}
            icon={CheckCircle}
          />
        </div>

        <ThreatsList />
      </div>
    </MainLayout>
  );
};

export default Threats;
