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
import { Building2, ChevronDown, LogOut, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export function TenantSwitcher() {
  const {
    currentOrganization,
    userOrganization,
    isSuperAdmin,
    isImpersonating,
    allOrganizations,
    setImpersonatedOrg,
  } = useTenant();

  if (!isSuperAdmin) return null;

  const handleExitImpersonation = () => {
    setImpersonatedOrg(null);
  };

  return (
    <div className="flex items-center gap-2">
      {isImpersonating && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-1.5">
          <Eye className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
            Viewing as: {currentOrganization?.name}
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
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isImpersonating ? "Switch Tenant" : "View as Tenant"}
            </span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto">
          <DropdownMenuLabel>Select Tenant</DropdownMenuLabel>
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

          {allOrganizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => setImpersonatedOrg(org)}
              className={cn(
                "flex items-center gap-2",
                currentOrganization?.id === org.id && "bg-accent"
              )}
            >
              <Building2 className="h-4 w-4" />
              <span className="flex-1 truncate">{org.name}</span>
              {org.id === userOrganization?.id && (
                <span className="text-xs text-muted-foreground">(yours)</span>
              )}
            </DropdownMenuItem>
          ))}

          {allOrganizations.length === 0 && (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No organizations found
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
