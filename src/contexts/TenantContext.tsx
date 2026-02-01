import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface Organization {
  id: string;
  name: string;
  slug: string;
  organization_type: "partner" | "customer";
  parent_partner_id: string | null;
  network_module_enabled: boolean;
}

interface TenantContextType {
  // The user's own organization
  userOrganization: Organization | null;
  // The currently active organization (might be impersonated)
  currentOrganization: Organization | null;
  // Whether the user is a super admin
  isSuperAdmin: boolean;
  // Whether the user is a partner admin
  isPartnerAdmin: boolean;
  // Whether we're currently impersonating another tenant
  isImpersonating: boolean;
  // All organizations (only available for super admins)
  allOrganizations: Organization[];
  // Partner's customer organizations (for partner admins)
  partnerCustomers: Organization[];
  // Set the impersonated organization (null to stop impersonating)
  setImpersonatedOrg: (org: Organization | null) => void;
  // Loading state
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType>({
  userOrganization: null,
  currentOrganization: null,
  isSuperAdmin: false,
  isPartnerAdmin: false,
  isImpersonating: false,
  allOrganizations: [],
  partnerCustomers: [],
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
  const [isPartnerAdmin, setIsPartnerAdmin] = useState(false);
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [partnerCustomers, setPartnerCustomers] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTenantData = async () => {
      if (!user) {
        setUserOrganization(null);
        setIsSuperAdmin(false);
        setIsPartnerAdmin(false);
        setAllOrganizations([]);
        setPartnerCustomers([]);
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

        // Check partner admin status
        const { data: isPartnerData, error: isPartnerError } = await supabase.rpc(
          "is_partner_admin",
          { _user_id: user.id }
        );
        if (isPartnerError) throw isPartnerError;

        const isPartner = !!isPartnerData;
        setIsPartnerAdmin(isPartner);

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
            .select("id, name, slug, organization_type, parent_partner_id, network_module_enabled")
            .eq("id", membershipData.organization_id)
            .single();

          if (orgData) {
            setUserOrganization(orgData as Organization);
          }
        }

        // If super admin, fetch all organizations
        if (isAdmin) {
          const { data: allOrgs, error: orgsError } = await supabase
            .from("organizations")
            .select("id, name, slug, organization_type, parent_partner_id, network_module_enabled")
            .order("name");

          if (orgsError) throw orgsError;

          setAllOrganizations((allOrgs || []) as Organization[]);
        }

        // If partner admin, fetch their customer organizations
        if (isPartner && !isAdmin) {
          const { data: customerOrgs, error: customerError } = await supabase
            .rpc("get_partner_customer_org_ids", { _user_id: user.id });

          if (customerError) throw customerError;

          if (customerOrgs && customerOrgs.length > 0) {
            const { data: customers } = await supabase
              .from("organizations")
              .select("id, name, slug, organization_type, parent_partner_id, network_module_enabled")
              .in("id", customerOrgs)
              .order("name");

            setPartnerCustomers((customers || []) as Organization[]);
          }
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
    if (!isSuperAdmin && !isPartnerAdmin && org !== null) {
      console.warn("Only super admins or partner admins can impersonate organizations");
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
        isPartnerAdmin,
        isImpersonating,
        allOrganizations,
        partnerCustomers,
        setImpersonatedOrg,
        isLoading,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};
