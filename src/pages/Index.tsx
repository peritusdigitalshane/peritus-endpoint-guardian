import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/ui/stat-card";
import { SecurityScore } from "@/components/dashboard/SecurityScore";
import { ThreatsList } from "@/components/dashboard/ThreatsList";
import { EndpointsTable } from "@/components/dashboard/EndpointsTable";
import { ComplianceChart } from "@/components/dashboard/ComplianceChart";
import { Monitor, ShieldAlert, ShieldCheck, Activity } from "lucide-react";

const Index = () => {
  return (
    <MainLayout>
      <div className="animate-fade-in space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Security Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor and manage endpoint security across your organization
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Endpoints"
            value={12}
            subtitle="Across 3 locations"
            icon={Monitor}
            trend={{ value: 8, isPositive: true }}
          />
          <StatCard
            title="Protected"
            value={10}
            subtitle="83% of fleet"
            icon={ShieldCheck}
            variant="success"
          />
          <StatCard
            title="Active Threats"
            value={2}
            subtitle="Requires attention"
            icon={ShieldAlert}
            variant="danger"
            trend={{ value: 12, isPositive: false }}
          />
          <StatCard
            title="Scans Today"
            value={48}
            subtitle="Avg. 4 per endpoint"
            icon={Activity}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <div className="space-y-6 lg:col-span-2">
            <ThreatsList />
            <EndpointsTable />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <SecurityScore score={85} />
            <ComplianceChart />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
