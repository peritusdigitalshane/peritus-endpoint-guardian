import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { PolicyCard } from "@/components/policies/PolicyCard";
import { PolicyEditor } from "@/components/policies/PolicyEditor";
import { StatCard } from "@/components/ui/stat-card";
import { DefenderPolicy } from "@/lib/defender-settings";
import { useToast } from "@/hooks/use-toast";

// Mock data for demonstration
const mockPolicies: DefenderPolicy[] = [
  {
    id: "1",
    organization_id: "org-1",
    name: "Standard Workstation",
    description: "Default policy for workstations based on your hardening script",
    is_default: true,
    realtime_monitoring: true,
    cloud_delivered_protection: true,
    maps_reporting: "Advanced",
    sample_submission: "SendAllSamples",
    check_signatures_before_scan: true,
    behavior_monitoring: true,
    ioav_protection: true,
    script_scanning: true,
    removable_drive_scanning: true,
    block_at_first_seen: true,
    pua_protection: true,
    signature_update_interval: 8,
    archive_scanning: true,
    email_scanning: true,
    cloud_block_level: "High",
    cloud_extended_timeout: 50,
    controlled_folder_access: true,
    network_protection: true,
    asr_block_vulnerable_drivers: "enabled",
    asr_block_email_executable: "enabled",
    asr_block_office_child_process: "enabled",
    asr_block_office_executable_content: "enabled",
    asr_block_office_code_injection: "enabled",
    asr_block_js_vbs_executable: "enabled",
    asr_block_obfuscated_scripts: "enabled",
    asr_block_office_macro_win32: "enabled",
    asr_block_untrusted_executables: "enabled",
    asr_advanced_ransomware_protection: "enabled",
    asr_block_credential_stealing: "audit",
    asr_block_psexec_wmi: "enabled",
    asr_block_usb_untrusted: "enabled",
    asr_block_office_comms_child_process: "audit",
    asr_block_adobe_child_process: "audit",
    asr_block_wmi_persistence: "enabled",
    exploit_protection_enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
  },
  {
    id: "2",
    organization_id: "org-1",
    name: "High Security",
    description: "Maximum protection for sensitive systems",
    is_default: false,
    realtime_monitoring: true,
    cloud_delivered_protection: true,
    maps_reporting: "Advanced",
    sample_submission: "SendAllSamples",
    check_signatures_before_scan: true,
    behavior_monitoring: true,
    ioav_protection: true,
    script_scanning: true,
    removable_drive_scanning: true,
    block_at_first_seen: true,
    pua_protection: true,
    signature_update_interval: 4,
    archive_scanning: true,
    email_scanning: true,
    cloud_block_level: "ZeroTolerance",
    cloud_extended_timeout: 50,
    controlled_folder_access: true,
    network_protection: true,
    asr_block_vulnerable_drivers: "enabled",
    asr_block_email_executable: "enabled",
    asr_block_office_child_process: "enabled",
    asr_block_office_executable_content: "enabled",
    asr_block_office_code_injection: "enabled",
    asr_block_js_vbs_executable: "enabled",
    asr_block_obfuscated_scripts: "enabled",
    asr_block_office_macro_win32: "enabled",
    asr_block_untrusted_executables: "enabled",
    asr_advanced_ransomware_protection: "enabled",
    asr_block_credential_stealing: "enabled",
    asr_block_psexec_wmi: "enabled",
    asr_block_usb_untrusted: "enabled",
    asr_block_office_comms_child_process: "enabled",
    asr_block_adobe_child_process: "enabled",
    asr_block_wmi_persistence: "enabled",
    exploit_protection_enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
  },
];

const Policies = () => {
  const [policies, setPolicies] = useState<DefenderPolicy[]>(mockPolicies);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<DefenderPolicy | undefined>();
  const { toast } = useToast();

  const handleEdit = (policy: DefenderPolicy) => {
    setEditingPolicy(policy);
    setEditorOpen(true);
  };

  const handleCreate = () => {
    setEditingPolicy(undefined);
    setEditorOpen(true);
  };

  const handleSave = (policyData: Partial<DefenderPolicy>) => {
    if (editingPolicy) {
      // Update existing policy
      setPolicies(policies.map(p => 
        p.id === editingPolicy.id ? { ...p, ...policyData } : p
      ));
      toast({
        title: "Policy updated",
        description: `${policyData.name} has been saved.`,
      });
    } else {
      // Create new policy
      const newPolicy: DefenderPolicy = {
        ...policyData as DefenderPolicy,
        id: crypto.randomUUID(),
        organization_id: "org-1",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: null,
      };
      setPolicies([...policies, newPolicy]);
      toast({
        title: "Policy created",
        description: `${policyData.name} has been created.`,
      });
    }
    setEditorOpen(false);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Policy Management</h1>
            <p className="text-muted-foreground">
              Configure and deploy Defender settings across your endpoints
            </p>
          </div>
          <Button onClick={handleCreate}>
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
