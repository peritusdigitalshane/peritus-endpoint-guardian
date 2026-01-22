import { useState } from "react";
import { useWdacRules, useWdacMutations, useWdacBaselines, WdacRule } from "@/hooks/useWdac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  ListChecks,
  Camera,
  FileText,
  AppWindow
} from "lucide-react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface WdacRulesProps {
  selectedPolicyId: string | null;
}

export function WdacRules({ selectedPolicyId }: WdacRulesProps) {
  const { data: rules, isLoading: rulesLoading } = useWdacRules(selectedPolicyId);
  const { data: baselines, isLoading: baselinesLoading } = useWdacBaselines(selectedPolicyId);
  const { createRule, deleteRule } = useWdacMutations();
  
  const [showAddRule, setShowAddRule] = useState(false);
  const [formData, setFormData] = useState({
    rule_type: "publisher" as WdacRule["rule_type"],
    action: "allow" as WdacRule["action"],
    value: "",
    publisher_name: "",
    product_name: "",
    description: "",
  });

  const handleCreateRule = () => {
    if (!selectedPolicyId || !formData.value) return;
    
    createRule.mutate({
      policy_id: selectedPolicyId,
      ...formData,
      file_version_min: null,
    });
    
    setShowAddRule(false);
    setFormData({
      rule_type: "publisher",
      action: "allow",
      value: "",
      publisher_name: "",
      product_name: "",
      description: "",
    });
  };

  const handleDeleteRule = (rule: WdacRule) => {
    if (confirm("Are you sure you want to delete this rule?")) {
      deleteRule.mutate({ id: rule.id, policyId: rule.policy_id });
    }
  };

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case "publisher": return "Publisher";
      case "path": return "File Path";
      case "hash": return "File Hash";
      case "file_name": return "File Name";
      default: return type;
    }
  };

  if (!selectedPolicyId) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AppWindow className="h-12 w-12 text-amber-500/50 mb-4" />
          <h3 className="font-medium text-foreground mb-1">No Policy Selected</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Select a policy from the Policies tab to view and manage its rules.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isLoading = rulesLoading || baselinesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allowRules = rules?.filter((r) => r.action === "allow") || [];
  const blockRules = rules?.filter((r) => r.action === "block") || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Policy Rules & Baselines</h2>
          <p className="text-sm text-muted-foreground">
            Manage allow/block rules and view baseline snapshots for the selected policy.
          </p>
        </div>
        <Button onClick={() => setShowAddRule(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Rules ({rules?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="baselines" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Baselines ({baselines?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6 mt-6">
          {/* Allow Rules */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Allow Rules ({allowRules.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!allowRules.length ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No allow rules defined. Applications matching allow rules will be permitted.
                </p>
              ) : (
                <ScrollArea className="h-[250px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allowRules.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell>
                            <Badge variant="secondary">{getRuleTypeLabel(rule.rule_type)}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm max-w-[300px] truncate">
                            {rule.value}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {rule.description || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(rule.created_at), "MMM d")}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteRule(rule)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Block Rules */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Block Rules ({blockRules.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!blockRules.length ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No block rules defined. Applications matching block rules will be denied.
                </p>
              ) : (
                <ScrollArea className="h-[250px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {blockRules.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell>
                            <Badge variant="secondary">{getRuleTypeLabel(rule.rule_type)}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm max-w-[300px] truncate">
                            {rule.value}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {rule.description || "-"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(rule.created_at), "MMM d")}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteRule(rule)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="baselines" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              {!baselines?.length ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Camera className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium text-foreground mb-1">No Baselines</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    Create a baseline from the Discovered Apps tab to capture a snapshot of allowed applications.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {baselines.map((baseline) => {
                    const appCount = Array.isArray(baseline.snapshot_data) ? baseline.snapshot_data.length : 0;
                    return (
                      <Card key={baseline.id} className="border">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <CardTitle className="text-base">{baseline.name}</CardTitle>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(baseline.created_at), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                            <Badge variant="secondary">
                              <FileText className="h-3 w-3 mr-1" />
                              {appCount} apps
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            {baseline.description || "No description provided"}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Rule Dialog */}
      <Dialog open={showAddRule} onOpenChange={setShowAddRule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Rule</DialogTitle>
            <DialogDescription>
              Create a new allow or block rule for this policy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Action</Label>
                <Select
                  value={formData.action}
                  onValueChange={(v: "allow" | "block") => setFormData({ ...formData, action: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="allow">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Allow</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="block">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span>Block</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rule Type</Label>
                <Select
                  value={formData.rule_type}
                  onValueChange={(v: WdacRule["rule_type"]) => setFormData({ ...formData, rule_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="publisher">Publisher</SelectItem>
                    <SelectItem value="path">File Path</SelectItem>
                    <SelectItem value="hash">File Hash</SelectItem>
                    <SelectItem value="file_name">File Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Value *</Label>
              <Input
                id="value"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                placeholder={
                  formData.rule_type === "publisher" ? "O=Microsoft Corporation, L=Redmond..." :
                  formData.rule_type === "path" ? "C:\\Program Files\\*" :
                  formData.rule_type === "hash" ? "SHA256 hash..." :
                  "notepad.exe"
                }
              />
            </div>
            {formData.rule_type === "publisher" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="publisher">Publisher Name</Label>
                  <Input
                    id="publisher"
                    value={formData.publisher_name}
                    onChange={(e) => setFormData({ ...formData, publisher_name: e.target.value })}
                    placeholder="Microsoft Corporation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product">Product Name</Label>
                  <Input
                    id="product"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    placeholder="Microsoft Office"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Why this rule exists..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRule(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateRule} 
              disabled={!formData.value || createRule.isPending}
            >
              {createRule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
