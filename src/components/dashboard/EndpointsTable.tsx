import { Monitor, Shield, Clock, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

interface Endpoint {
  id: string;
  name: string;
  os: string;
  defenderVersion: string;
  lastSeen: string;
  status: "healthy" | "warning" | "critical";
  protectionStatus: string;
}

const mockEndpoints: Endpoint[] = [
  {
    id: "1",
    name: "DESKTOP-WK001",
    os: "Windows 11 Pro",
    defenderVersion: "4.18.24070.5",
    lastSeen: "2 min ago",
    status: "healthy",
    protectionStatus: "Protected",
  },
  {
    id: "2",
    name: "LAPTOP-MK003",
    os: "Windows 10 Enterprise",
    defenderVersion: "4.18.24070.5",
    lastSeen: "5 min ago",
    status: "warning",
    protectionStatus: "Signature Update Required",
  },
  {
    id: "3",
    name: "SERVER-DB01",
    os: "Windows Server 2022",
    defenderVersion: "4.18.24070.5",
    lastSeen: "1 hour ago",
    status: "healthy",
    protectionStatus: "Protected",
  },
  {
    id: "4",
    name: "DESKTOP-WK002",
    os: "Windows 11 Pro",
    defenderVersion: "4.18.24060.4",
    lastSeen: "3 hours ago",
    status: "critical",
    protectionStatus: "Scan Required",
  },
  {
    id: "5",
    name: "LAPTOP-ST005",
    os: "Windows 10 Pro",
    defenderVersion: "4.18.24070.5",
    lastSeen: "Online",
    status: "healthy",
    protectionStatus: "Protected",
  },
];

const statusLabels = {
  healthy: "Healthy",
  warning: "Warning",
  critical: "Critical",
};

export function EndpointsTable() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Managed Endpoints</h3>
        </div>
        <button className="text-sm text-primary hover:underline">Manage All</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Endpoint
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Operating System
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Defender Version
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Last Seen
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mockEndpoints.map((endpoint) => (
              <tr
                key={endpoint.id}
                className="group transition-colors hover:bg-secondary/30"
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {endpoint.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {endpoint.protectionStatus}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className="text-sm text-foreground">{endpoint.os}</span>
                </td>
                <td className="px-4 py-4">
                  <code className="rounded bg-secondary px-2 py-1 text-xs text-muted-foreground">
                    {endpoint.defenderVersion}
                  </code>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge
                    status={endpoint.status}
                    label={statusLabels[endpoint.status]}
                    pulse={endpoint.status !== "healthy"}
                  />
                </td>
                <td className="px-4 py-4">
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {endpoint.lastSeen}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <button className="rounded-lg p-2 text-muted-foreground opacity-0 transition-all hover:bg-secondary hover:text-foreground group-hover:opacity-100">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
