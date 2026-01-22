import { AlertTriangle, Clock, Monitor } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

interface Threat {
  id: string;
  name: string;
  endpoint: string;
  severity: "critical" | "warning" | "info";
  timestamp: string;
  status: "active" | "resolved" | "investigating";
}

const mockThreats: Threat[] = [
  {
    id: "1",
    name: "Suspicious PowerShell Activity",
    endpoint: "DESKTOP-WK001",
    severity: "critical",
    timestamp: "2 min ago",
    status: "active",
  },
  {
    id: "2",
    name: "Unauthorized Network Connection",
    endpoint: "LAPTOP-MK003",
    severity: "warning",
    timestamp: "15 min ago",
    status: "investigating",
  },
  {
    id: "3",
    name: "Outdated Defender Signatures",
    endpoint: "SERVER-DB01",
    severity: "info",
    timestamp: "1 hour ago",
    status: "resolved",
  },
  {
    id: "4",
    name: "Blocked Malware Execution",
    endpoint: "DESKTOP-WK002",
    severity: "critical",
    timestamp: "3 hours ago",
    status: "resolved",
  },
];

const severityStyles = {
  critical: "border-l-status-critical",
  warning: "border-l-status-warning",
  info: "border-l-status-info",
};

const statusMap: Record<string, "healthy" | "warning" | "critical" | "info"> = {
  active: "critical",
  investigating: "warning",
  resolved: "healthy",
};

export function ThreatsList() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-status-warning" />
          <h3 className="font-semibold text-foreground">Recent Threats</h3>
        </div>
        <button className="text-sm text-primary hover:underline">View All</button>
      </div>
      
      <div className="divide-y divide-border">
        {mockThreats.map((threat) => (
          <div
            key={threat.id}
            className={cn(
              "flex items-center gap-4 border-l-2 p-4 transition-colors hover:bg-secondary/50",
              severityStyles[threat.severity]
            )}
          >
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-foreground">{threat.name}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Monitor className="h-3 w-3" />
                  {threat.endpoint}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {threat.timestamp}
                </span>
              </div>
            </div>
            <StatusBadge
              status={statusMap[threat.status]}
              label={threat.status.charAt(0).toUpperCase() + threat.status.slice(1)}
              pulse={threat.status === "active"}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
