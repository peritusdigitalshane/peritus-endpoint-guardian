import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Shield, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { PolicyCard } from "@/components/policies/PolicyCard";
import { PolicyEditor } from "@/components/policies/PolicyEditor";
import { StatCard } from "@/components/ui/stat-card";
import { DefenderPolicy } from "@/lib/defender-settings";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { useCreatePolicy, usePolicies, useUpdatePolicy } from "@/hooks/usePolicies";

const Policies = () => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<DefenderPolicy | undefined>();
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

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Policy Management</h1>
            <p className="text-muted-foreground">
              Configure and deploy Defender settings across your endpoints
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
