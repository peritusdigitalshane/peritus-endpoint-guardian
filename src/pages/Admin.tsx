import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useTenant } from "@/contexts/TenantContext";
import { useOrganizationsWithStats, useCreateOrganization } from "@/hooks/useSuperAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Building2, 
  Plus, 
  Users, 
  Monitor, 
  Eye, 
  Settings,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const Admin = () => {
  const { isSuperAdmin, setImpersonatedOrg, isLoading: tenantLoading } = useTenant();
  const { data: organizations = [], isLoading } = useOrganizationsWithStats();
  const createOrg = useCreateOrganization();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");

  // Generate slug from name
  const handleNameChange = (name: string) => {
    setNewOrgName(name);
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setNewOrgSlug(slug);
  };

  const handleCreateOrg = async () => {
    if (!newOrgName.trim() || !newOrgSlug.trim()) {
      toast({
        title: "Missing fields",
        description: "Please provide both name and slug.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createOrg.mutateAsync({ name: newOrgName.trim(), slug: newOrgSlug.trim() });
      toast({
        title: "Customer created",
        description: `${newOrgName} has been created successfully.`,
      });
      setCreateDialogOpen(false);
      setNewOrgName("");
      setNewOrgSlug("");
    } catch (error: any) {
      toast({
        title: "Failed to create customer",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewAsTenant = (org: { id: string; name: string; slug: string }) => {
    setImpersonatedOrg(org);
    toast({
      title: "Viewing as tenant",
      description: `Now viewing as ${org.name}. Use the header to switch or exit.`,
    });
    navigate("/dashboard");
  };

  if (tenantLoading || isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground mt-2">
            You do not have permission to access the admin panel.
          </p>
          <Button className="mt-6" onClick={() => navigate("/dashboard")}>
            Return to Dashboard
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary text-primary">
                Super Admin
              </Badge>
            </div>
            <h1 className="text-2xl font-bold mt-2">Customer Management</h1>
            <p className="text-muted-foreground">
              Create and manage customer organizations
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{organizations.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <Monitor className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Endpoints</p>
                <p className="text-2xl font-bold">
                  {organizations.reduce((acc, org) => acc + org.endpoint_count, 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">
                  {organizations.reduce((acc, org) => acc + org.member_count, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Customers Table */}
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-center">Endpoints</TableHead>
                <TableHead className="text-center">Users</TableHead>
                <TableHead className="text-center">Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{org.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {org.slug}
                    </code>
                  </TableCell>
                  <TableCell className="text-center">{org.endpoint_count}</TableCell>
                  <TableCell className="text-center">{org.member_count}</TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {new Date(org.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewAsTenant(org)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View as Tenant
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {organizations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No customers found. Create your first customer to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Create Organization Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                Create a new customer organization. They will be able to manage their own endpoints and policies.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Customer Name</Label>
                <Input
                  id="org-name"
                  placeholder="Acme Corporation"
                  value={newOrgName}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">Slug (URL identifier)</Label>
                <Input
                  id="org-slug"
                  placeholder="acme-corporation"
                  value={newOrgSlug}
                  onChange={(e) => setNewOrgSlug(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Used in URLs and API calls. Only lowercase letters, numbers, and hyphens.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateOrg} disabled={createOrg.isPending}>
                {createOrg.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Customer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Admin;
