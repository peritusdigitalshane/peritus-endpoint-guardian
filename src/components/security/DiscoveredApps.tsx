import { useState, useMemo } from "react";
import { useWdacDiscoveredApps, useWdacMutations, useWdacPolicies, WdacDiscoveredApp } from "@/hooks/useWdac";
import { useRuleSets, useRuleSetMutations } from "@/hooks/useRuleSets";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, 
  Package, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Camera,
  Filter,
  Layers
} from "lucide-react";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DiscoveredAppsProps {
  selectedPolicyId: string | null;
}

export function DiscoveredApps({ selectedPolicyId }: DiscoveredAppsProps) {
  const { data: apps, isLoading } = useWdacDiscoveredApps();
  const { data: policies } = useWdacPolicies();
  const { data: ruleSets } = useRuleSets();
  const { createRule, createBaseline } = useWdacMutations();
  const { addRulesBulk } = useRuleSetMutations();
  
  const [search, setSearch] = useState("");
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [showBaselineDialog, setShowBaselineDialog] = useState(false);
  const [showRuleSetDialog, setShowRuleSetDialog] = useState(false);
  const [ruleAction, setRuleAction] = useState<"allow" | "block">("allow");
  const [ruleType, setRuleType] = useState<"publisher" | "path" | "hash" | "file_name">("publisher");
  const [baselineName, setBaselineName] = useState("");
  const [selectedRuleSetId, setSelectedRuleSetId] = useState<string>("");

  const filteredApps = useMemo(() => {
    if (!apps) return [];
    return apps.filter((app) => {
      const searchLower = search.toLowerCase();
      return (
        app.file_name.toLowerCase().includes(searchLower) ||
        app.file_path.toLowerCase().includes(searchLower) ||
        app.publisher?.toLowerCase().includes(searchLower) ||
        app.product_name?.toLowerCase().includes(searchLower) ||
        app.endpoints?.hostname?.toLowerCase().includes(searchLower)
      );
    });
  }, [apps, search]);

  const toggleApp = (id: string) => {
    const newSelected = new Set(selectedApps);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedApps(newSelected);
  };

  const toggleAll = () => {
    if (selectedApps.size === filteredApps.length) {
      setSelectedApps(new Set());
    } else {
      setSelectedApps(new Set(filteredApps.map((a) => a.id)));
    }
  };

  const handleCreateRules = () => {
    if (!selectedPolicyId) return;
    
    const selectedAppsList = filteredApps.filter((a) => selectedApps.has(a.id));
    
    selectedAppsList.forEach((app) => {
      let value = "";
      switch (ruleType) {
        case "publisher":
          value = app.publisher || app.file_name;
          break;
        case "path":
          value = app.file_path;
          break;
        case "hash":
          value = app.file_hash || "";
          break;
        case "file_name":
          value = app.file_name;
          break;
      }
      
      if (value) {
        createRule.mutate({
          policy_id: selectedPolicyId,
          rule_type: ruleType,
          action: ruleAction,
          value,
          publisher_name: app.publisher,
          product_name: app.product_name,
          description: `Auto-created from discovered app: ${app.file_name}`,
        });
      }
    });
    
    setShowRuleDialog(false);
    setSelectedApps(new Set());
  };

  const handleAddToRuleSet = () => {
    if (!selectedRuleSetId) return;
    
    const selectedAppsList = filteredApps.filter((a) => selectedApps.has(a.id));
    const rules = selectedAppsList.map((app) => {
      let value = "";
      switch (ruleType) {
        case "publisher":
          value = app.publisher || app.file_name;
          break;
        case "path":
          value = app.file_path;
          break;
        case "hash":
          value = app.file_hash || "";
          break;
        case "file_name":
          value = app.file_name;
          break;
      }
      
      return {
        rule_set_id: selectedRuleSetId,
        rule_type: ruleType,
        action: ruleAction,
        value,
        publisher_name: app.publisher || null,
        product_name: app.product_name || null,
        file_version_min: null,
        description: `From discovered app: ${app.file_name}`,
      };
    }).filter(r => r.value);
    
    if (rules.length > 0) {
      addRulesBulk.mutate(rules);
    }
    
    setShowRuleSetDialog(false);
    setSelectedApps(new Set());
    setSelectedRuleSetId("");
  };

  const handleCreateBaseline = () => {
    if (!selectedPolicyId || !baselineName) return;
    
    const selectedAppsList = filteredApps.filter((a) => selectedApps.has(a.id));
    const snapshotData = selectedAppsList.map((app) => ({
      file_name: app.file_name,
      file_path: app.file_path,
      file_hash: app.file_hash,
      publisher: app.publisher,
      product_name: app.product_name,
    }));
    
    createBaseline.mutate({
      policy_id: selectedPolicyId,
      name: baselineName,
      snapshot_data: snapshotData,
    });
    
    setShowBaselineDialog(false);
    setBaselineName("");
    setSelectedApps(new Set());
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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Discovered Applications</h2>
          <p className="text-sm text-muted-foreground">
            Applications detected across your endpoints. Select apps to add to rule sets.
          </p>
        </div>
        <div className="flex gap-2">
          {selectedApps.size > 0 && (
            <>
              {ruleSets && ruleSets.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => setShowRuleSetDialog(true)}
                >
                  <Layers className="h-4 w-4 mr-2" />
                  Add to Rule Set ({selectedApps.size})
                </Button>
              )}
              {selectedPolicyId && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBaselineDialog(true)}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Baseline ({selectedApps.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRuleDialog(true)}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Legacy Rules ({selectedApps.size})
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* No policy warning - only for legacy features */}
      {!selectedPolicyId && !ruleSets?.length && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <Layers className="h-5 w-5 text-amber-500" />
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Create a Rule Set first to add rules from discovered applications.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, path, publisher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Apps Table */}
      {!filteredApps.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-foreground mb-1">No Applications Discovered</h3>
            <p className="text-sm text-muted-foreground">
              Applications will appear here once agents report their inventory
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedApps.size === filteredApps.length && filteredApps.length > 0}
                      onCheckedChange={toggleAll}
                      disabled={!selectedPolicyId}
                    />
                  </TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead>Publisher</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead className="text-right">Executions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedApps.has(app.id)}
                        onCheckedChange={() => toggleApp(app.id)}
                        disabled={!selectedPolicyId}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{app.file_name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {app.file_path}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{app.publisher || "Unknown"}</div>
                        {app.product_name && (
                          <div className="text-xs text-muted-foreground">{app.product_name}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {app.endpoints?.hostname || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {app.discovery_source === "agent_inventory" && "Agent"}
                        {app.discovery_source === "event_log" && "Event Log"}
                        {app.discovery_source === "both" && "Both"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(app.last_seen_at), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {app.execution_count}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* Create Rules Dialog */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Rules for Selected Apps</DialogTitle>
            <DialogDescription>
              Create allow or block rules for {selectedApps.size} selected application(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={ruleAction} onValueChange={(v: "allow" | "block") => setRuleAction(v)}>
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
              <Select value={ruleType} onValueChange={(v: "publisher" | "path" | "hash" | "file_name") => setRuleType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="publisher">Publisher (Recommended)</SelectItem>
                  <SelectItem value="path">File Path</SelectItem>
                  <SelectItem value="hash">File Hash</SelectItem>
                  <SelectItem value="file_name">File Name</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Publisher rules are most flexible. Hash rules are most specific but break on updates.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRules} disabled={createRule.isPending}>
              {createRule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create {selectedApps.size} Rule(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Baseline Dialog */}
      <Dialog open={showBaselineDialog} onOpenChange={setShowBaselineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Baseline Snapshot</DialogTitle>
            <DialogDescription>
              Capture the current state of {selectedApps.size} selected application(s) as a baseline.
              This can be used to quickly restore or compare application states.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="baseline-name">Baseline Name</Label>
              <Input
                id="baseline-name"
                value={baselineName}
                onChange={(e) => setBaselineName(e.target.value)}
                placeholder="e.g., Production Baseline 2024-01"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBaselineDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateBaseline} 
              disabled={!baselineName || createBaseline.isPending}
            >
              {createBaseline.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Baseline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Rule Set Dialog */}
      <Dialog open={showRuleSetDialog} onOpenChange={setShowRuleSetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Rule Set</DialogTitle>
            <DialogDescription>
              Add {selectedApps.size} selected application(s) as rules to an existing rule set.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rule Set</Label>
              <Select value={selectedRuleSetId} onValueChange={setSelectedRuleSetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a rule set..." />
                </SelectTrigger>
                <SelectContent>
                  {ruleSets?.map((rs) => (
                    <SelectItem key={rs.id} value={rs.id}>
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        <span>{rs.name}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {rs.rule_count || 0} rules
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={ruleAction} onValueChange={(v: "allow" | "block") => setRuleAction(v)}>
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
              <Select value={ruleType} onValueChange={(v: "publisher" | "path" | "hash" | "file_name") => setRuleType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="publisher">Publisher (Recommended)</SelectItem>
                  <SelectItem value="path">File Path</SelectItem>
                  <SelectItem value="hash">File Hash</SelectItem>
                  <SelectItem value="file_name">File Name</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Publisher rules are most flexible. Hash rules are most specific but break on updates.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleSetDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddToRuleSet} 
              disabled={!selectedRuleSetId || addRulesBulk.isPending}
            >
              {addRulesBulk.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add {selectedApps.size} Rule(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
