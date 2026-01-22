import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComplianceItem {
  name: string;
  status: "compliant" | "non-compliant" | "partial";
  percentage: number;
}

const complianceItems: ComplianceItem[] = [
  { name: "Real-time Protection", status: "compliant", percentage: 100 },
  { name: "Cloud Protection", status: "compliant", percentage: 100 },
  { name: "Signature Updates", status: "partial", percentage: 92 },
  { name: "Tamper Protection", status: "compliant", percentage: 100 },
  { name: "Controlled Folder Access", status: "partial", percentage: 75 },
  { name: "Network Protection", status: "non-compliant", percentage: 58 },
];

const statusIcons = {
  compliant: CheckCircle,
  "non-compliant": XCircle,
  partial: AlertCircle,
};

const statusColors = {
  compliant: "text-status-healthy",
  "non-compliant": "text-status-critical",
  partial: "text-status-warning",
};

const barColors = {
  compliant: "bg-status-healthy",
  "non-compliant": "bg-status-critical",
  partial: "bg-status-warning",
};

export function ComplianceChart() {
  const overallCompliance = Math.round(
    complianceItems.reduce((acc, item) => acc + item.percentage, 0) /
      complianceItems.length
  );

  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h3 className="font-semibold text-foreground">Policy Compliance</h3>
          <p className="text-xs text-muted-foreground">
            Defender configuration status across endpoints
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-foreground">
            {overallCompliance}%
          </span>
          <p className="text-xs text-muted-foreground">Overall</p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {complianceItems.map((item) => {
          const Icon = statusIcons[item.status];
          return (
            <div key={item.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", statusColors[item.status])} />
                  <span className="text-sm font-medium text-foreground">
                    {item.name}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {item.percentage}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    barColors[item.status]
                  )}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
