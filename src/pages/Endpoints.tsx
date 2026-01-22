import { MainLayout } from "@/components/layout/MainLayout";
import { EndpointsTable } from "@/components/dashboard/EndpointsTable";
import { Button } from "@/components/ui/button";
import { Plus, Download, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

const Endpoints = () => {
  return (
    <MainLayout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Endpoints</h1>
            <p className="text-sm text-muted-foreground">
              Manage and monitor all registered endpoints
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync All
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/policies">Policies</Link>
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button size="sm" className="bg-gradient-primary hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              Add Endpoint
            </Button>
          </div>
        </div>

        <EndpointsTable />
      </div>
    </MainLayout>
  );
};

export default Endpoints;
