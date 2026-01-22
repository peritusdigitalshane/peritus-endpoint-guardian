import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface TenantContextType {
  // The user's own organization
  userOrganization: Organization | null;
  // The currently active organization (might be impersonated)
  currentOrganization: Organization | null;
  // Whether the user is a super admin
  isSuperAdmin: boolean;
  // Whether we're currently impersonating another tenant
  isImpersonating: boolean;
  // All organizations (only available for super admins)
  allOrganizations: Organization[];
  // Set the impersonated organization (null to stop impersonating)
  setImpersonatedOrg: (org: Organization | null) => void;
  // Loading state
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType>({
  userOrganization: null,
  currentOrganization: null,
  isSuperAdmin: false,
  isImpersonating: false,
  allOrganizations: [],
  setImpersonatedOrg: () => {},
  isLoading: true,
});

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
};

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [userOrganization, setUserOrganization] = useState<Organization | null>(null);
  const [impersonatedOrg, setImpersonatedOrgState] = useState<Organization | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTenantData = async () => {
      if (!user) {
        setUserOrganization(null);
        setIsSuperAdmin(false);
        setAllOrganizations([]);
        setImpersonatedOrgState(null);
        setIsLoading(false);
        return;
      }

      try {
        // Check super admin status via SECURITY DEFINER function (avoids RLS edge cases)
        const { data: isAdminData, error: isAdminError } = await supabase.rpc(
          "is_super_admin",
          { _user_id: user.id }
        );
        if (isAdminError) throw isAdminError;

        const isAdmin = !!isAdminData;
        setIsSuperAdmin(isAdmin);

        // Get user's organization
        const { data: membershipData, error: membershipError } = await supabase
          .from("organization_memberships")
          .select("organization_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (membershipError) {
          // Don't block super admin functionality if membership lookup fails
          console.warn("Failed to load user organization membership:", membershipError);
        }

        if (membershipData) {
          const { data: orgData } = await supabase
            .from("organizations")
            .select("id, name, slug")
            .eq("id", membershipData.organization_id)
            .single();

          if (orgData) {
            setUserOrganization(orgData);
          }
        }

        // If super admin, fetch all organizations
        if (isAdmin) {
          const { data: allOrgs, error: orgsError } = await supabase
            .from("organizations")
            .select("id, name, slug")
            .order("name");

          if (orgsError) throw orgsError;

          setAllOrganizations(allOrgs || []);
        }
      } catch (error) {
        console.error("Error loading tenant data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      loadTenantData();
    }
  }, [user, authLoading]);

  const setImpersonatedOrg = (org: Organization | null) => {
    if (!isSuperAdmin && org !== null) {
      console.warn("Only super admins can impersonate organizations");
      return;
    }
    setImpersonatedOrgState(org);
  };

  const currentOrganization = impersonatedOrg || userOrganization;
  const isImpersonating = impersonatedOrg !== null;

  return (
    <TenantContext.Provider
      value={{
        userOrganization,
        currentOrganization,
        isSuperAdmin,
        isImpersonating,
        allOrganizations,
        setImpersonatedOrg,
        isLoading,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};
