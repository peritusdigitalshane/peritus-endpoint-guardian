import { useState } from "react";
import { 
  FolderOpen, 
  Plus, 
  MoreVertical, 
  Shield, 
  AppWindow, 
  Users, 
  Pencil, 
  Trash2,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EndpointGroup,
  useEndpointGroups,
  useCreateEndpointGroup,
  useUpdateEndpointGroup,
  useDeleteEndpointGroup,
} from "@/hooks/useEndpointGroups";
import { usePolicyOptions } from "@/hooks/usePolicies";
import { useWdacPolicies } from "@/hooks/useWdac";
import { GroupMembersDialog } from "./GroupMembersDialog";

export function EndpointGroupsManager() {
  const { data: groups = [], isLoading } = useEndpointGroups();
  const { data: defenderPolicies = [] } = usePolicyOptions();
  const { data: wdacPolicies = [] } = useWdacPolicies();
  const createGroup = useCreateEndpointGroup();
  const updateGroup = useUpdateEndpointGroup();
  const deleteGroup = useDeleteEndpointGroup();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<EndpointGroup | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<EndpointGroup | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    defender_policy_id: "",
    wdac_policy_id: "",
  });

  const handleOpenCreate = () => {
    setEditingGroup(null);
    setFormData({
      name: "",
      description: "",
      defender_policy_id: "",
      wdac_policy_id: "",
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (group: EndpointGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
      defender_policy_id: group.defender_policy_id || "",
      wdac_policy_id: group.wdac_policy_id || "",
    });
    setDialogOpen(true);
  };

  const handleOpenDelete = (group: EndpointGroup) => {
    setSelectedGroup(group);
    setDeleteDialogOpen(true);
  };

  const handleOpenMembers = (group: EndpointGroup) => {
    setSelectedGroup(group);
    setMembersDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingGroup) {
      await updateGroup.mutateAsync({
        id: editingGroup.id,
        name: formData.name,
        description: formData.description || null,
        defender_policy_id: formData.defender_policy_id || null,
        wdac_policy_id: formData.wdac_policy_id || null,
      });
    } else {
      await createGroup.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        defender_policy_id: formData.defender_policy_id || null,
        wdac_policy_id: formData.wdac_policy_id || null,
      });
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (selectedGroup) {
      await deleteGroup.mutateAsync(selectedGroup.id);
      setDeleteDialogOpen(false);
      setSelectedGroup(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Endpoint Groups</h2>
          <p className="text-sm text-muted-foreground">
            Organize endpoints and assign policies to groups
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Group
        </Button>
      </div>

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No groups yet</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Create groups to organize your endpoints and assign policies in bulk. 
              For example, create a "SQL Servers" group and assign specific policies.
            </p>
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <FolderOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{group.name}</CardTitle>
                      {group.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {group.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenMembers(group)}>
                        <Users className="mr-2 h-4 w-4" />
                        Manage Members
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenEdit(group)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Group
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleOpenDelete(group)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Group
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Endpoint count */}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {group.endpoint_count} endpoint{group.endpoint_count !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Policies */}
                <div className="flex flex-wrap gap-2">
                  {group.defender_policy ? (
                    <Badge variant="secondary" className="text-xs">
                      <Shield className="mr-1 h-3 w-3" />
                      {group.defender_policy.name}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      <Shield className="mr-1 h-3 w-3" />
                      No Defender policy
                    </Badge>
                  )}
                  {group.wdac_policy ? (
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${
                        group.wdac_policy.mode === "enforced" 
                          ? "bg-destructive/10 text-destructive" 
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      <AppWindow className="mr-1 h-3 w-3" />
                      {group.wdac_policy.name} ({group.wdac_policy.mode})
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      <AppWindow className="mr-1 h-3 w-3" />
                      No WDAC policy
                    </Badge>
                  )}
                </div>

                {/* Quick action */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => handleOpenMembers(group)}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Manage Members
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? "Edit Group" : "Create Group"}
            </DialogTitle>
            <DialogDescription>
              {editingGroup 
                ? "Update the group settings and policy assignments."
                : "Create a new endpoint group to organize your devices."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                placeholder="e.g., SQL Servers"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe the purpose of this group..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Defender Policy</Label>
              <Select
                value={formData.defender_policy_id}
                onValueChange={(v) => setFormData({ ...formData, defender_policy_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a policy..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No policy</SelectItem>
                  {defenderPolicies.map((policy) => (
                    <SelectItem key={policy.id} value={policy.id}>
                      {policy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>WDAC Policy</Label>
              <Select
                value={formData.wdac_policy_id}
                onValueChange={(v) => setFormData({ ...formData, wdac_policy_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a policy..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No policy</SelectItem>
                  {wdacPolicies.map((policy) => (
                    <SelectItem key={policy.id} value={policy.id}>
                      {policy.name} ({policy.mode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!formData.name || createGroup.isPending || updateGroup.isPending}
            >
              {(createGroup.isPending || updateGroup.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingGroup ? "Save Changes" : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedGroup?.name}"? 
              This will remove all endpoints from this group. The endpoints themselves will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Members Dialog */}
      {selectedGroup && (
        <GroupMembersDialog
          group={selectedGroup}
          open={membersDialogOpen}
          onOpenChange={setMembersDialogOpen}
        />
      )}
    </div>
  );
}
