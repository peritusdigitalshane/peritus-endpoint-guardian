import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, Shield, AlertTriangle, CheckCircle, Loader2, Layers, ShieldCheck, RefreshCw, Monitor } from "lucide-react";
import { PolicyCard } from "@/components/policies/PolicyCard";
import { PolicyEditor } from "@/components/policies/PolicyEditor";
import { StatCard } from "@/components/ui/stat-card";
import { DefenderPolicy } from "@/lib/defender-settings";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useCreatePolicy, usePolicies, useUpdatePolicy } from "@/hooks/usePolicies";

// Import security components
import { WdacPolicies } from "@/components/security/WdacPolicies";
import { DiscoveredApps } from "@/components/security/DiscoveredApps";
import { WdacRules } from "@/components/security/WdacRules";
import { EndpointWdacList } from "@/components/security/EndpointWdacList";
import { RuleSetsManager } from "@/components/security/RuleSetsManager";
import { UacPoliciesManager } from "@/components/security/UacPoliciesManager";
import { EndpointUacList } from "@/components/security/EndpointUacList";
import { WindowsUpdatePoliciesManager } from "@/components/security/WindowsUpdatePoliciesManager";
import { EndpointWindowsUpdateList } from "@/components/security/EndpointWindowsUpdateList";

const Policies = () => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<DefenderPolicy | undefined>();
  const [selectedWdacPolicyId, setSelectedWdacPolicyId] = useState<string | null>(null);
  const [selectedRuleSetId, setSelectedRuleSetId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const { currentOrganization, isLoading: tenantLoading } = useTenant();
  const { data: policies = [], isLoading: policiesLoading, error: policiesError } = usePolicies();
  const createPolicy = useCreatePolicy();
  const updatePolicy = useUpdatePolicy();

  const sanitizePolicyPatch = useMemo(() => {
    return (policyData: Partial<DefenderPolicy>) => {
      // Never allow client-side updates to move policies between orgs
      const { id, organization_id, created_at, updated_at, created_by, ...rest } = policyData as any;
      return rest as Partial<DefenderPolicy>;
    };
  }, []);

  const handleEdit = (policy: DefenderPolicy) => {
    setEditingPolicy(policy);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingPolicy(undefined);
    setEditorOpen(true);
  };

  const handleSave = async (policyData: Partial<DefenderPolicy>) => {
    if (!user || !currentOrganization) {
      toast({
        title: "Can't save policy",
        description: "Missing user session or organization.",
        variant: "destructive",
      });
      return;
    }

    const clean = sanitizePolicyPatch(policyData);

    try {
      if (editingPolicy) {
        await updatePolicy.mutateAsync({ id: editingPolicy.id, patch: clean });
        toast({
          title: "Policy updated",
          description: `${policyData.name} has been saved.`,
        });
      } else {
        await createPolicy.mutateAsync({ orgId: currentOrganization.id, userId: user.id, policy: clean });
        toast({
          title: "Policy created",
          description: `${policyData.name} has been created.`,
        });
      }
      setEditorOpen(false);
    } catch (e) {
      toast({
        title: "Failed to save policy",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const totalAsrEnabled = policies.reduce((acc, p) => {
    const count = [
      p.asr_block_vulnerable_drivers,
      p.asr_block_email_executable,
      p.asr_block_office_child_process,
      p.asr_block_office_executable_content,
      p.asr_block_office_code_injection,
      p.asr_block_js_vbs_executable,
      p.asr_block_obfuscated_scripts,
      p.asr_block_office_macro_win32,
      p.asr_block_untrusted_executables,
      p.asr_advanced_ransomware_protection,
      p.asr_block_credential_stealing,
      p.asr_block_psexec_wmi,
      p.asr_block_usb_untrusted,
      p.asr_block_office_comms_child_process,
      p.asr_block_adobe_child_process,
      p.asr_block_wmi_persistence,
    ].filter(r => r === "enabled").length;
    return acc + count;
  }, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Policy Management</h1>
              <p className="text-muted-foreground">
                Configure Defender, Application Control, UAC, and Windows Update policies
              </p>
            </div>
          </div>
        </div>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="defender" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="defender" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Defender</span>
            </TabsTrigger>
            <TabsTrigger value="rulesets" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Rule Sets</span>
            </TabsTrigger>
            <TabsTrigger value="wdac-endpoints" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">WDAC Status</span>
            </TabsTrigger>
            <TabsTrigger value="apps" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Apps</span>
            </TabsTrigger>
            <TabsTrigger value="baselines" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Baselines</span>
            </TabsTrigger>
            <TabsTrigger value="wdac-policies" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">WDAC Policies</span>
            </TabsTrigger>
            <TabsTrigger value="uac-policies" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">UAC</span>
            </TabsTrigger>
            <TabsTrigger value="uac-status" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">UAC Status</span>
            </TabsTrigger>
            <TabsTrigger value="wu-policies" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Updates</span>
            </TabsTrigger>
            <TabsTrigger value="wu-status" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">Update Status</span>
            </TabsTrigger>
          </TabsList>

          {/* Defender Tab */}
          <TabsContent value="defender" className="space-y-6">
            {(authLoading || tenantLoading || policiesLoading) && (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {policiesError && (
              <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
                Failed to load policies.
              </div>
            )}

            {/* Header with Create Button */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Defender Policies</h2>
                <p className="text-sm text-muted-foreground">
                  Configure Microsoft Defender settings and ASR rules
                </p>
              </div>
              <Button onClick={handleCreate} disabled={!currentOrganization}>
                <Plus className="mr-2 h-4 w-4" />
                Create Policy
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Policies"
                value={policies.length}
                icon={FileText}
              />
              <StatCard
                title="ASR Rules Enabled"
                value={totalAsrEnabled}
                icon={Shield}
                variant="success"
              />
              <StatCard
                title="Endpoints Covered"
                value="127"
                icon={CheckCircle}
              />
              <StatCard
                title="Non-Compliant"
                value="3"
                icon={AlertTriangle}
                variant="warning"
              />
            </div>

            {/* Policy Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {policies.map((policy) => (
                <PolicyCard key={policy.id} policy={policy} onEdit={handleEdit} />
              ))}
            </div>
          </TabsContent>

          {/* WDAC Rule Sets Tab */}
          <TabsContent value="rulesets">
            <RuleSetsManager 
              selectedRuleSetId={selectedRuleSetId}
              onSelectRuleSet={setSelectedRuleSetId}
            />
          </TabsContent>

          {/* WDAC Endpoints Tab */}
          <TabsContent value="wdac-endpoints">
            <EndpointWdacList />
          </TabsContent>

          {/* Discovered Apps Tab */}
          <TabsContent value="apps">
            <DiscoveredApps selectedPolicyId={selectedWdacPolicyId} />
          </TabsContent>

          {/* Baselines Tab */}
          <TabsContent value="baselines">
            <WdacRules selectedPolicyId={selectedWdacPolicyId} onSelectPolicy={setSelectedWdacPolicyId} />
          </TabsContent>

          {/* WDAC Policies Tab */}
          <TabsContent value="wdac-policies">
            <WdacPolicies 
              onSelectPolicy={setSelectedWdacPolicyId} 
              selectedPolicyId={selectedWdacPolicyId}
            />
          </TabsContent>

          {/* UAC Policies Tab */}
          <TabsContent value="uac-policies">
            <UacPoliciesManager />
          </TabsContent>

          {/* UAC Status Tab */}
          <TabsContent value="uac-status">
            <EndpointUacList />
          </TabsContent>

          {/* Windows Update Policies Tab */}
          <TabsContent value="wu-policies">
            <WindowsUpdatePoliciesManager />
          </TabsContent>

          {/* Windows Update Status Tab */}
          <TabsContent value="wu-status">
            <EndpointWindowsUpdateList />
          </TabsContent>
        </Tabs>

        {/* Policy Editor */}
        {editorOpen && (
          <PolicyEditor
            policy={editingPolicy}
            onSave={handleSave}
            onClose={() => setEditorOpen(false)}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default Policies;
