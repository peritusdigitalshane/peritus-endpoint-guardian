import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/ui/stat-card";
import { SecurityScore } from "@/components/dashboard/SecurityScore";
import { ThreatsList } from "@/components/dashboard/ThreatsList";
import { EndpointsTable } from "@/components/dashboard/EndpointsTable";
import { ComplianceChart } from "@/components/dashboard/ComplianceChart";
import { Button } from "@/components/ui/button";
import { Shield, Monitor, AlertTriangle, CheckCircle, Sparkles } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardData";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { 
    isLoading,
    totalEndpoints, 
    protectedCount, 
    activeThreats, 
    compliancePercentage,
    securityScore,
    recommendations,
  } = useDashboardStats();

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Security Dashboard</h1>
            <p className="text-muted-foreground">
              Overview of your endpoint security posture
            </p>
          </div>
          <Button asChild>
            <Link to="/recommendations">
              <Sparkles className="mr-2 h-4 w-4" />
              AI Recommendations
            </Link>
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Endpoints"
            value={isLoading ? "-" : totalEndpoints.toString()}
            icon={Monitor}
          />
          <StatCard
            title="Protected"
            value={isLoading ? "-" : protectedCount.toString()}
            icon={Shield}
          />
          <StatCard
            title="Active Threats"
            value={isLoading ? "-" : activeThreats.toString()}
            icon={AlertTriangle}
          />
          <StatCard
            title="Compliant"
            value={isLoading ? "-" : `${compliancePercentage}%`}
            icon={CheckCircle}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Security Score */}
          <div className="lg:col-span-1">
            <SecurityScore 
              score={isLoading ? 0 : securityScore} 
              endpointCount={totalEndpoints}
              recommendations={recommendations}
            />
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
