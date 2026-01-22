import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WdacPolicies } from "@/components/security/WdacPolicies";
import { DiscoveredApps } from "@/components/security/DiscoveredApps";
import { WdacRules } from "@/components/security/WdacRules";
import { Shield, Eye, AppWindow, ListChecks } from "lucide-react";

export default function Security() {
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Application Control</h1>
              <p className="text-muted-foreground">
                Manage Windows Defender Application Control (WDAC) policies
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="policies" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="policies" className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Policies
            </TabsTrigger>
            <TabsTrigger value="apps" className="flex items-center gap-2">
              <AppWindow className="h-4 w-4" />
              Discovered Apps
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Rules
            </TabsTrigger>
          </TabsList>

          <TabsContent value="policies">
            <WdacPolicies 
              onSelectPolicy={setSelectedPolicyId} 
              selectedPolicyId={selectedPolicyId}
            />
          </TabsContent>

          <TabsContent value="apps">
            <DiscoveredApps selectedPolicyId={selectedPolicyId} />
          </TabsContent>

          <TabsContent value="rules">
            <WdacRules selectedPolicyId={selectedPolicyId} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
