import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WdacPolicies } from "@/components/security/WdacPolicies";
import { DiscoveredApps } from "@/components/security/DiscoveredApps";
import { WdacRules } from "@/components/security/WdacRules";
import { EndpointWdacList } from "@/components/security/EndpointWdacList";
import { RuleSetsManager } from "@/components/security/RuleSetsManager";
import { UacPoliciesManager } from "@/components/security/UacPoliciesManager";
import { EndpointUacList } from "@/components/security/EndpointUacList";
import { Shield, AppWindow, ListChecks, Monitor, Layers, Camera, ShieldCheck } from "lucide-react";

export default function Security() {
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [selectedRuleSetId, setSelectedRuleSetId] = useState<string | null>(null);

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
              <h1 className="text-2xl font-bold text-foreground">Security Controls</h1>
              <p className="text-muted-foreground">
                Manage Application Control (WDAC) and User Account Control (UAC) settings
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="rulesets" className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-7">
            <TabsTrigger value="rulesets" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Rule Sets</span>
            </TabsTrigger>
            <TabsTrigger value="endpoints" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">WDAC</span>
            </TabsTrigger>
            <TabsTrigger value="apps" className="flex items-center gap-2">
              <AppWindow className="h-4 w-4" />
              <span className="hidden sm:inline">Apps</span>
            </TabsTrigger>
            <TabsTrigger value="baselines" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Baselines</span>
            </TabsTrigger>
            <TabsTrigger value="policies" className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              <span className="hidden sm:inline">Policies</span>
            </TabsTrigger>
            <TabsTrigger value="uac-policies" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">UAC</span>
            </TabsTrigger>
            <TabsTrigger value="uac-status" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">UAC Status</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rulesets">
            <RuleSetsManager 
              selectedRuleSetId={selectedRuleSetId}
              onSelectRuleSet={setSelectedRuleSetId}
            />
          </TabsContent>

          <TabsContent value="endpoints">
            <EndpointWdacList />
          </TabsContent>

          <TabsContent value="apps">
            <DiscoveredApps selectedPolicyId={selectedPolicyId} />
          </TabsContent>

          <TabsContent value="baselines">
            <WdacRules selectedPolicyId={selectedPolicyId} onSelectPolicy={setSelectedPolicyId} />
          </TabsContent>

          <TabsContent value="policies">
            <WdacPolicies 
              onSelectPolicy={setSelectedPolicyId} 
              selectedPolicyId={selectedPolicyId}
            />
          </TabsContent>

          <TabsContent value="uac-policies">
            <UacPoliciesManager />
          </TabsContent>

          <TabsContent value="uac-status">
            <EndpointUacList />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
