import { useParams, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Monitor, Shield, AlertTriangle, ScrollText,
  Activity, HardDrive, CheckCircle2, XCircle, FileText
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

const getEndpointStatus = (isOnline: boolean, lastSeenAt: string | null): "healthy" | "warning" | "critical" => {
  if (!lastSeenAt) return "critical";
  const diffMinutes = (Date.now() - new Date(lastSeenAt).getTime()) / (1000 * 60);
  if (diffMinutes <= 10) return "healthy";
  if (diffMinutes <= 60) return "warning";
  return "critical";
};

const BooleanIndicator = ({ value, label }: { value: boolean | null; label: string }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-muted-foreground">{label}</span>
  {value === null ? (
      <span className="text-xs text-muted-foreground">N/A</span>
    ) : value ? (
      <CheckCircle2 className="h-4 w-4 text-status-healthy" />
    ) : (
      <XCircle className="h-4 w-4 text-destructive" />
    )}
  </div>
);

const EndpointDetail = () => {
  const { id } = useParams<{ id: string }>();

  const { data: endpoint, isLoading: endpointLoading } = useQuery({
    queryKey: ["endpoint-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("endpoints")
        .select("*, defender_policies(id, name)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: latestStatus } = useQuery({
    queryKey: ["endpoint-status", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("endpoint_status")
        .select("*")
        .eq("endpoint_id", id!)
        .order("collected_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: threats } = useQuery({
    queryKey: ["endpoint-threats", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("endpoint_threats")
        .select("*")
        .eq("endpoint_id", id!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: recentLogs } = useQuery({
    queryKey: ["endpoint-recent-logs", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("endpoint_event_logs")
        .select("*")
        .eq("endpoint_id", id!)
        .order("event_time", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: groups } = useQuery({
    queryKey: ["endpoint-groups", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("endpoint_group_memberships")
        .select("group_id, endpoint_groups(id, name, defender_policy_id, gpo_policy_id, uac_policy_id, windows_update_policy_id)")
        .eq("endpoint_id", id!);
      if (error) throw error;
      return data || [];
    },
  });

  if (endpointLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!endpoint) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Monitor className="h-12 w-12 mb-4" />
          <p>Endpoint not found</p>
          <Button asChild variant="link" className="mt-2">
            <Link to="/endpoints">Back to Endpoints</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  const status = getEndpointStatus(endpoint.is_online, endpoint.last_seen_at);
  const statusLabel = status === "healthy" ? "Online" : status === "warning" ? "Idle" : "Offline";
  const activeThreats = threats?.filter(t => !["Resolved", "Removed", "Blocked"].includes(t.status)) || [];
  const defenderPolicy = endpoint.defender_policies as { id: string; name: string } | null;

  return (
    <MainLayout>
      <div className="animate-fade-in space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/endpoints">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Monitor className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">{endpoint.hostname}</h1>
              <StatusBadge status={status} label={statusLabel} />
              {activeThreats.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {activeThreats.length} Active Threat{activeThreats.length > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {endpoint.last_seen_at
                ? `Last seen ${formatDistanceToNow(new Date(endpoint.last_seen_at), { addSuffix: true })}`
                : "Never seen"}
              {" · "}Registered {format(new Date(endpoint.created_at), "MMM d, yyyy")}
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <HardDrive className="h-4 w-4" /> System
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <p className="text-sm"><span className="text-muted-foreground">OS:</span> {endpoint.os_version || "Unknown"}</p>
              <p className="text-sm"><span className="text-muted-foreground">Build:</span> {endpoint.os_build || "Unknown"}</p>
              <p className="text-sm"><span className="text-muted-foreground">Agent:</span> {endpoint.agent_version || "Unknown"}</p>
              <p className="text-sm"><span className="text-muted-foreground">Defender:</span> {endpoint.defender_version || "Unknown"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" /> Protection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-0">
              <BooleanIndicator value={latestStatus?.realtime_protection_enabled ?? null} label="Real-time Protection" />
              <BooleanIndicator value={latestStatus?.antivirus_enabled ?? null} label="Antivirus" />
              <BooleanIndicator value={latestStatus?.behavior_monitor_enabled ?? null} label="Behavior Monitor" />
              <BooleanIndicator value={latestStatus?.ioav_protection_enabled ?? null} label="IOAV Protection" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" /> Policies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Defender Policy</p>
                <p className="text-sm font-medium">{defenderPolicy?.name || "None"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Groups</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {groups && groups.length > 0 ? groups.map(g => {
                    const grp = g.endpoint_groups as unknown as { id: string; name: string } | null;
                    return grp ? (
                      <Badge key={grp.id} variant="secondary" className="text-xs">{grp.name}</Badge>
                    ) : null;
                  }) : <span className="text-xs text-muted-foreground">No groups</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Threats Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-2xl font-bold text-destructive">{activeThreats.length}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{threats?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
              {latestStatus?.antivirus_signature_age !== null && latestStatus?.antivirus_signature_age !== undefined && (
                <p className="text-xs text-muted-foreground mt-2">
                  Signature age: {latestStatus.antivirus_signature_age} day{latestStatus.antivirus_signature_age !== 1 ? "s" : ""}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="threats" className="space-y-4">
          <TabsList>
            <TabsTrigger value="threats">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Threats ({threats?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="events">
              <ScrollText className="h-4 w-4 mr-2" />
              Event Logs ({recentLogs?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="status">
              <Activity className="h-4 w-4 mr-2" />
              Full Status
            </TabsTrigger>
          </TabsList>

          <TabsContent value="threats">
            <Card>
              <CardContent className="pt-6">
                {threats && threats.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Threat</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Detected</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {threats.map(threat => (
                        <TableRow key={threat.id}>
                          <TableCell className="font-medium">{threat.threat_name}</TableCell>
                          <TableCell>
                            <Badge variant={
                              threat.severity === "Severe" ? "destructive" :
                              threat.severity === "High" ? "destructive" :
                              threat.severity === "Moderate" ? "secondary" : "outline"
                            }>
                              {threat.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              ["Resolved", "Removed", "Blocked"].includes(threat.status) ? "outline" : "destructive"
                            }>
                              {threat.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{threat.category || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {threat.initial_detection_time
                              ? formatDistanceToNow(new Date(threat.initial_detection_time), { addSuffix: true })
                              : "Unknown"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No threats detected on this endpoint</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card>
              <CardContent className="pt-6">
                {recentLogs && recentLogs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Event ID</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead className="max-w-md">Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentLogs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                            {format(new Date(log.event_time), "MMM d HH:mm:ss")}
                          </TableCell>
                          <TableCell>{log.event_id}</TableCell>
                          <TableCell>
                            <Badge variant={
                              log.level === "Error" || log.level === "Critical" ? "destructive" :
                              log.level === "Warning" ? "secondary" : "outline"
                            } className="text-xs">
                              {log.level}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{log.provider_name || log.log_source}</TableCell>
                          <TableCell className="max-w-md truncate text-xs">{log.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No event logs found for this endpoint</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="status">
            <Card>
              <CardContent className="pt-6">
                {latestStatus ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3">Defender Protection</h3>
                      <div className="space-y-0 divide-y divide-border">
                        <BooleanIndicator value={latestStatus.realtime_protection_enabled} label="Real-time Protection" />
                        <BooleanIndicator value={latestStatus.antivirus_enabled} label="Antivirus" />
                        <BooleanIndicator value={latestStatus.antispyware_enabled} label="Antispyware" />
                        <BooleanIndicator value={latestStatus.behavior_monitor_enabled} label="Behavior Monitor" />
                        <BooleanIndicator value={latestStatus.ioav_protection_enabled} label="IOAV Protection" />
                        <BooleanIndicator value={latestStatus.on_access_protection_enabled} label="On-Access Protection" />
                        <BooleanIndicator value={latestStatus.nis_enabled} label="Network Inspection" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3">Signatures & Scans</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">AV Signature Age</span>
                          <span>{latestStatus.antivirus_signature_age ?? "N/A"} days</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">AV Signature Version</span>
                          <span className="text-xs">{latestStatus.antivirus_signature_version || "N/A"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Quick Scan Age</span>
                          <span>{latestStatus.quick_scan_age ?? "N/A"} days</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Full Scan Age</span>
                          <span>{latestStatus.full_scan_age ?? "N/A"} days</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Tamper Protection</span>
                          <span>{latestStatus.tamper_protection_source || "N/A"}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-3">UAC Settings</h3>
                      <div className="space-y-0 divide-y divide-border">
                        <BooleanIndicator value={latestStatus.uac_enabled} label="UAC Enabled" />
                        <BooleanIndicator value={latestStatus.uac_prompt_on_secure_desktop} label="Secure Desktop" />
                        <BooleanIndicator value={latestStatus.uac_detect_installations} label="Detect Installations" />
                        <BooleanIndicator value={latestStatus.uac_validate_admin_signatures} label="Validate Admin Sigs" />
                        <BooleanIndicator value={latestStatus.uac_filter_administrator_token} label="Filter Admin Token" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground mb-3 mt-6">Windows Update</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Pending Updates</span>
                          <span>{latestStatus.wu_pending_updates_count ?? "N/A"}</span>
                        </div>
                        <BooleanIndicator value={latestStatus.wu_restart_pending} label="Restart Pending" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No status data collected yet</p>
                  </div>
                )}
                {latestStatus && (
                  <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                    Last collected: {format(new Date(latestStatus.collected_at), "MMM d, yyyy HH:mm:ss")}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default EndpointDetail;
