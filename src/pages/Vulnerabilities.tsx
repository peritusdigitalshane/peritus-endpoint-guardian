import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bug,
  ShieldAlert,
  AlertTriangle,
  Monitor,
  Search,
  ExternalLink,
  MoreHorizontal,
  CheckCircle,
  ShieldOff,
  Package,
  Loader2,
  Play,
} from "lucide-react";
import { useState } from "react";
import { VulnerabilityImportDialog } from "@/components/vulnerabilities/VulnerabilityImportDialog";
import {
  useVulnerabilityFindings,
  useVulnerabilityStats,
  useSoftwareInventory,
  useUpdateFindingStatus,
  
} from "@/hooks/useVulnerabilities";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const severityConfig: Record<string, { color: string; label: string }> = {
  critical: { color: "bg-red-500/10 text-red-500 border-red-500/20", label: "Critical" },
  high: { color: "bg-orange-500/10 text-orange-500 border-orange-500/20", label: "High" },
  medium: { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", label: "Medium" },
  low: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", label: "Low" },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  open: { color: "bg-red-500/10 text-red-500 border-red-500/20", label: "Open" },
  mitigated: { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", label: "Mitigated" },
  accepted: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", label: "Accepted" },
  resolved: { color: "bg-green-500/10 text-green-500 border-green-500/20", label: "Resolved" },
};

const Vulnerabilities = () => {
  const { data: findings, isLoading } = useVulnerabilityFindings();
  const { stats } = useVulnerabilityStats();
  const { data: software } = useSoftwareInventory();
  const updateStatus = useUpdateFindingStatus();
  const { currentOrganization } = useTenant();
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);

  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const handleRunScan = async () => {
    if (!currentOrganization) return;
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("vulnerability-scan", {
        body: { organization_id: currentOrganization.id },
      });
      if (error) throw error;
      toast({
        title: "Scan complete",
        description: data.message || `Found ${data.findings} vulnerabilities.`,
      });
    } catch (err: any) {
      toast({
        title: "Scan failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const filteredFindings = (findings || []).filter((f) => {
    const matchesSearch =
      !search ||
      f.cve_id.toLowerCase().includes(search.toLowerCase()) ||
      f.affected_software.toLowerCase().includes(search.toLowerCase()) ||
      (f.endpoints as any)?.hostname?.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severityFilter === "all" || f.severity === severityFilter;
    const matchesStatus = statusFilter === "all" || f.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  // Group software by name for inventory view
  const softwareGrouped = (software || []).reduce((acc, item) => {
    const key = `${item.software_name}|${item.software_version}`;
    if (!acc[key]) {
      acc[key] = { ...item, count: 0 };
    }
    acc[key].count++;
    return acc;
  }, {} as Record<string, any>);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Vulnerability Scanner</h1>
            <p className="text-muted-foreground">
              CVE findings across your endpoints from scans, KB gap analysis, and imports
            </p>
          </div>
          <div className="flex gap-2">
            <VulnerabilityImportDialog />
            <Button onClick={handleRunScan} disabled={isScanning}>
              {isScanning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Run Scan
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total CVEs"
            value={isLoading ? "-" : stats.total.toString()}
            icon={Bug}
          />
          <StatCard
            title="Critical"
            value={isLoading ? "-" : stats.critical.toString()}
            icon={ShieldAlert}
          />
          <StatCard
            title="High"
            value={isLoading ? "-" : stats.high.toString()}
            icon={AlertTriangle}
          />
          <StatCard
            title="Open"
            value={isLoading ? "-" : stats.open.toString()}
            icon={ShieldOff}
          />
          <StatCard
            title="Affected Endpoints"
            value={isLoading ? "-" : stats.affectedEndpoints.toString()}
            icon={Monitor}
          />
        </div>

        <Tabs defaultValue="findings">
          <TabsList>
            <TabsTrigger value="findings">CVE Findings</TabsTrigger>
            <TabsTrigger value="inventory">Software Inventory</TabsTrigger>
          </TabsList>

          <TabsContent value="findings" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search CVE ID, software, or hostname..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severity</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="mitigated">Mitigated</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Findings Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  CVE Findings
                  {filteredFindings.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({filteredFindings.length})
                    </span>
                  )}
                </CardTitle>
                <CardDescription>
                  Vulnerabilities detected across your fleet
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredFindings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
                    <h3 className="text-lg font-semibold">No vulnerabilities found</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">
                      {stats.total === 0
                        ? "No CVE findings yet. Vulnerabilities will appear here once the agent collects software inventory and scans are run."
                        : "No findings match your current filters."}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>CVE ID</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>CVSS</TableHead>
                          <TableHead>Affected Software</TableHead>
                          <TableHead>Endpoint</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Found</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFindings.map((finding) => {
                          const sev = severityConfig[finding.severity] || severityConfig.medium;
                          const stat = statusConfig[finding.status] || statusConfig.open;
                          return (
                            <TableRow key={finding.id}>
                              <TableCell>
                                <a
                                  href={`https://nvd.nist.gov/vuln/detail/${finding.cve_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 font-mono text-sm text-primary hover:underline"
                                >
                                  {finding.cve_id}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={sev.color}>
                                  {sev.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono text-sm">
                                  {finding.cvss_score ?? "-"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="text-sm font-medium">{finding.affected_software}</p>
                                  {finding.affected_version && (
                                    <p className="text-xs text-muted-foreground">
                                      v{finding.affected_version}
                                      {finding.fixed_version && (
                                        <span className="ml-1">
                                          → fix: v{finding.fixed_version}
                                        </span>
                                      )}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {(finding.endpoints as any)?.hostname || "Unknown"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={stat.color}>
                                  {stat.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(finding.created_at), { addSuffix: true })}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {finding.status === "open" && (
                                      <>
                                        <DropdownMenuItem
                                          onClick={() =>
                                            updateStatus.mutate({ id: finding.id, status: "mitigated" })
                                          }
                                        >
                                          Mark Mitigated
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() =>
                                            updateStatus.mutate({ id: finding.id, status: "accepted" })
                                          }
                                        >
                                          Accept Risk
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() =>
                                            updateStatus.mutate({ id: finding.id, status: "resolved" })
                                          }
                                        >
                                          Mark Resolved
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {finding.status !== "open" && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          updateStatus.mutate({ id: finding.id, status: "open" })
                                        }
                                      >
                                        Reopen
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem asChild>
                                      <a
                                        href={`https://nvd.nist.gov/vuln/detail/${finding.cve_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        View on NVD
                                      </a>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Software Inventory
                </CardTitle>
                <CardDescription>
                  Installed software collected from your endpoints
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(softwareGrouped).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mb-3" />
                    <h3 className="text-lg font-semibold">No software inventory yet</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md">
                      Software inventory will appear here once endpoints report their installed applications.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Software</TableHead>
                          <TableHead>Version</TableHead>
                          <TableHead>Publisher</TableHead>
                          <TableHead>Endpoints</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.values(softwareGrouped).map((sw: any) => (
                          <TableRow key={`${sw.software_name}-${sw.software_version}`}>
                            <TableCell className="font-medium">{sw.software_name}</TableCell>
                            <TableCell className="font-mono text-sm">
                              {sw.software_version || "-"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {sw.publisher || "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{sw.count}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Vulnerabilities;
