import { useState } from "react";
import { useDirectCustomers, usePartners, useAssignCustomerToPartner } from "@/hooks/usePartners";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Monitor, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";

export function DirectCustomersSection() {
  const { data: customers, isLoading } = useDirectCustomers();
  const { data: partners } = usePartners();
  const assignToPartner = useAssignCustomerToPartner();
  const { setImpersonatedOrg } = useTenant();

  const [assigningId, setAssigningId] = useState<string | null>(null);

  const handleAssign = async (customerId: string, partnerId: string) => {
    try {
      await assignToPartner.mutateAsync({ customerId, partnerId });
      toast.success("Customer assigned to partner");
      setAssigningId(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to assign customer");
    }
  };

  const handleViewAs = (customer: any) => {
    setImpersonatedOrg({
      id: customer.id,
      name: customer.name,
      slug: customer.slug,
      organization_type: customer.organization_type,
      parent_partner_id: null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Direct Customers</h3>
        <p className="text-sm text-muted-foreground">
          Individual signups not assigned to any partner
        </p>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Endpoints</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Assign to Partner</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers?.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-muted-foreground">{customer.slug}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.endpoint_count || 0}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(customer.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {assigningId === customer.id ? (
                    <div className="flex items-center gap-2">
                      <Select onValueChange={(value) => handleAssign(customer.id, value)}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select partner" />
                        </SelectTrigger>
                        <SelectContent>
                          {partners?.map((partner) => (
                            <SelectItem key={partner.id} value={partner.id}>
                              {partner.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAssigningId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAssigningId(customer.id)}
                      disabled={!partners?.length}
                    >
                      Assign
                    </Button>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewAs(customer)}
                  >
                    View as
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {customers?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No direct customers found. All customers are assigned to partners.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}