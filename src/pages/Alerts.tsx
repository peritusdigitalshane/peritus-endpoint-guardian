import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Bell, CheckCircle, AlertTriangle, Shield, Clock, Filter } from "lucide-react";
import { useAlerts, useAcknowledgeAlert, useBulkAcknowledgeAlerts } from "@/hooks/useAlerts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

const severityColors: Record<string, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/30",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  low: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  info: "bg-muted text-muted-foreground border-border",
};

export default function Alerts() {
  const { data: alerts, isLoading } = useAlerts();
  const acknowledge = useAcknowledgeAlert();
  const bulkAcknowledge = useBulkAcknowledgeAlerts();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("unacknowledged");

  const filtered = (alerts ?? []).filter((a) => {
    if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
    if (filterStatus === "unacknowledged" && a.acknowledged) return false;
    if (filterStatus === "acknowledged" && !a.acknowledged) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((a) => a.id)));
    }
  };

  const handleBulkAck = () => {
    if (selected.size === 0) return;
    bulkAcknowledge.mutate(Array.from(selected), {
      onSuccess: () => setSelected(new Set()),
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Alerts</h1>
            <p className="text-muted-foreground">Security alerts and notifications</p>
          </div>
          {selected.size > 0 && (
            <Button onClick={handleBulkAck} disabled={bulkAcknowledge.isPending} size="sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              Acknowledge {selected.size} selected
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unacknowledged">Unacknowledged</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Alert List */}
        <div className="rounded-xl border border-border bg-card shadow-card">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">Loading alerts...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No alerts to display</p>
            </div>
          ) : (
            <div>
              {/* Header row */}
              <div className="flex items-center gap-3 border-b border-border px-4 py-3 bg-secondary/50">
                <Checkbox
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onCheckedChange={selectAll}
                />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex-1">
                  {filtered.length} alert{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="divide-y divide-border">
                {filtered.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                      alert.acknowledged ? "opacity-60" : "hover:bg-secondary/30"
                    }`}
                  >
                    <Checkbox
                      checked={selected.has(alert.id)}
                      onCheckedChange={() => toggleSelect(alert.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={severityColors[alert.severity] || severityColors.info}>
                          {alert.severity}
                        </Badge>
                        <span className="text-sm font-medium text-foreground truncate">{alert.title}</span>
                        {alert.acknowledged && (
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{alert.message}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                        </span>
                        {alert.endpoints?.hostname && (
                          <Link
                            to={`/endpoints/${alert.endpoint_id}`}
                            className="text-xs text-primary hover:underline"
                          >
                            {alert.endpoints.hostname}
                          </Link>
                        )}
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => acknowledge.mutate(alert.id)}
                        disabled={acknowledge.isPending}
                        className="flex-shrink-0"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
