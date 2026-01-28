import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/contexts/TenantContext";
import { PlatformSettingsSection } from "@/components/admin/PlatformSettingsSection";
import { VirusTotalSettingsCard } from "@/components/admin/VirusTotalSettingsCard";
import { Building2 } from "lucide-react";

const Settings = () => {
  const { currentOrganization, isSuperAdmin } = useTenant();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your organization and platform settings
          </p>
        </div>

        <div className="grid gap-6">
          {/* Organization Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Organization</CardTitle>
                  <CardDescription>
                    Current organization details
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{currentOrganization?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">
                    {currentOrganization?.organization_type || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Slug</p>
                  <p className="font-medium">{currentOrganization?.slug || "—"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Super Admin Only Settings */}
          {isSuperAdmin && (
            <>
              <PlatformSettingsSection />
              <VirusTotalSettingsCard />
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
