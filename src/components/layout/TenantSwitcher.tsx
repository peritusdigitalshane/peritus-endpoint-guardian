import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Building2, ChevronDown, LogOut, Eye, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export function TenantSwitcher() {
  const {
    currentOrganization,
    userOrganization,
    isSuperAdmin,
    isPartnerAdmin,
    isImpersonating,
    allOrganizations,
    partnerCustomers,
    setImpersonatedOrg,
  } = useTenant();

  // Only show for super admins or partner admins with customers
  if (!isSuperAdmin && (!isPartnerAdmin || partnerCustomers.length === 0)) return null;

  const handleExitImpersonation = () => {
    setImpersonatedOrg(null);
  };

  // Determine which organizations to show
  const availableOrgs = isSuperAdmin ? allOrganizations : partnerCustomers;
  const switcherLabel = isSuperAdmin ? "View as Tenant" : "Switch Customer";

  return (
    <div className="flex items-center gap-2">
      {isImpersonating && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-1.5">
          <Eye className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
            Viewing: {currentOrganization?.name}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 ml-1 hover:bg-amber-500/20"
            onClick={handleExitImpersonation}
          >
            <LogOut className="h-3 w-3 mr-1" />
            Exit
          </Button>
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            {isSuperAdmin ? <Building2 className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            <span className="hidden sm:inline">
              {isImpersonating ? "Switch" : switcherLabel}
            </span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
          <DropdownMenuLabel>
            {isSuperAdmin ? "Select Tenant" : "Select Customer"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {isImpersonating && (
            <>
              <DropdownMenuItem onClick={handleExitImpersonation}>
                <LogOut className="h-4 w-4 mr-2" />
                Exit to {userOrganization?.name}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {availableOrgs.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => setImpersonatedOrg(org)}
              className={cn(
                "flex items-center gap-2",
                currentOrganization?.id === org.id && "bg-accent"
              )}
            >
              <Building2 className="h-4 w-4" />
              <div className="flex-1 truncate">
                <span>{org.name}</span>
                {org.organization_type === "partner" && (
                  <span className="ml-1 text-xs text-primary">(Partner)</span>
                )}
              </div>
              {org.id === userOrganization?.id && (
                <span className="text-xs text-muted-foreground">(yours)</span>
              )}
            </DropdownMenuItem>
          ))}

          {availableOrgs.length === 0 && (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No organizations found
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
