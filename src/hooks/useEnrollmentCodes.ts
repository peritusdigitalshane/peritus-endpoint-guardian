import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface EnrollmentCode {
  id: string;
  code: string;
  organization_id: string;
  role: "owner" | "admin" | "member";
  is_single_use: boolean;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  is_active: boolean;
}

export interface CodeValidationResult {
  organization_id: string | null;
  organization_name: string | null;
  role: "owner" | "admin" | "member" | null;
  is_valid: boolean;
  error_message: string | null;
}

export function useEnrollmentCodes(orgId?: string) {
  const { currentOrganization, isSuperAdmin } = useTenant();
  const targetOrgId = orgId || currentOrganization?.id;

  return useQuery({
    queryKey: ["enrollment-codes", targetOrgId],
    enabled: !!targetOrgId,
    queryFn: async () => {
      let query = supabase
        .from("enrollment_codes")
        .select("*")
        .order("created_at", { ascending: false });

      // If not super admin, filter by org
      if (!isSuperAdmin && targetOrgId) {
        query = query.eq("organization_id", targetOrgId);
      } else if (isSuperAdmin && targetOrgId) {
        query = query.eq("organization_id", targetOrgId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EnrollmentCode[];
    },
  });
}

export function useCreateEnrollmentCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      role,
      isSingleUse,
      maxUses,
      expiresAt,
    }: {
      organizationId: string;
      role: "owner" | "admin" | "member";
      isSingleUse: boolean;
      maxUses?: number | null;
      expiresAt?: string | null;
    }) => {
      // Generate a random code
      const code = generateCode();

      const { data, error } = await supabase
        .from("enrollment_codes")
        .insert({
          code,
          organization_id: organizationId,
          role,
          is_single_use: isSingleUse,
          max_uses: isSingleUse ? 1 : maxUses,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) throw error;
      return data as EnrollmentCode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollment-codes"] });
    },
  });
}

export function useDeactivateEnrollmentCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ codeId }: { codeId: string }) => {
      const { error } = await supabase
        .from("enrollment_codes")
        .update({ is_active: false })
        .eq("id", codeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollment-codes"] });
    },
  });
}

export function useValidateEnrollmentCode() {
  return useMutation({
    mutationFn: async (code: string): Promise<CodeValidationResult> => {
      const { data, error } = await supabase.rpc("validate_enrollment_code", {
        _code: code,
      });

      if (error) throw error;
      
      // The function returns an array with one row
      const result = data?.[0];
      if (!result) {
        return {
          organization_id: null,
          organization_name: null,
          role: null,
          is_valid: false,
          error_message: "Invalid enrollment code",
        };
      }

      return result as CodeValidationResult;
    },
  });
}

// Generate a readable 8-character code
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluded similar chars like 0/O, 1/I
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}