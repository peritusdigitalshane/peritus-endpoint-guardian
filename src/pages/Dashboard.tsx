import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/ui/stat-card";
import { SecurityScore } from "@/components/dashboard/SecurityScore";
import { ThreatsList } from "@/components/dashboard/ThreatsList";
import { EndpointsTable } from "@/components/dashboard/EndpointsTable";
import { ComplianceChart } from "@/components/dashboard/ComplianceChart";
import { Shield, Monitor, AlertTriangle, CheckCircle } from "lucide-react";

const Dashboard = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Security Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your endpoint security posture
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Endpoints"
            value="127"
            icon={Monitor}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Protected"
            value="118"
            icon={Shield}
            trend={{ value: 5, isPositive: true }}
          />
          <StatCard
            title="Active Threats"
            value="3"
            icon={AlertTriangle}
            trend={{ value: 2, isPositive: false }}
          />
          <StatCard
            title="Compliant"
            value="94%"
            icon={CheckCircle}
            trend={{ value: 3, isPositive: true }}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Security Score */}
          <div className="lg:col-span-1">
            <SecurityScore score={87} />
          </div>

          {/* Compliance Chart */}
          <div className="lg:col-span-2">
            <ComplianceChart />
          </div>
        </div>

        {/* Threats and Endpoints */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ThreatsList />
          <EndpointsTable />
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
