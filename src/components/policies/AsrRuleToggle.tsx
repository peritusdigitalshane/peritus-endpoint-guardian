import { cn } from "@/lib/utils";
import { Shield, AlertTriangle, XCircle } from "lucide-react";
import { AsrAction } from "@/lib/defender-settings";

interface AsrRuleToggleProps {
  name: string;
  description: string;
  guid: string;
  value: AsrAction;
  recommendedMode: AsrAction;
  onChange: (value: AsrAction) => void;
}

export function AsrRuleToggle({
  name,
  description,
  guid,
  value,
  recommendedMode,
  onChange,
}: AsrRuleToggleProps) {
  const actions: { value: AsrAction; label: string; icon: React.ReactNode; color: string }[] = [
    { value: "disabled", label: "Off", icon: <XCircle className="h-3.5 w-3.5" />, color: "text-muted-foreground" },
    { value: "audit", label: "Audit", icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-status-warning" },
    { value: "enabled", label: "Block", icon: <Shield className="h-3.5 w-3.5" />, color: "text-status-healthy" },
  ];

  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border/40 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{name}</p>
          {value === recommendedMode && (
            <span className="text-xs text-status-healthy">✓ Recommended</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        <code className="text-xs text-muted-foreground/60 mt-1 block">{guid}</code>
      </div>
      <div className="flex rounded-lg border border-border/60 bg-secondary/30 p-0.5">
        {actions.map((action) => (
          <button
            key={action.value}
            type="button"
            onClick={() => onChange(action.value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              value === action.value
                ? "bg-background shadow-sm"
                : "hover:bg-background/50",
              value === action.value ? action.color : "text-muted-foreground"
            )}
          >
            {action.icon}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
