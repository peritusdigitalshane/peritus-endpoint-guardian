import { cn } from "@/lib/utils";

interface SecurityScoreProps {
  score: number;
  endpointCount: number;
  className?: string;
}

export function SecurityScore({ score, endpointCount, className }: SecurityScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-status-healthy";
    if (score >= 60) return "text-status-warning";
    return "text-status-critical";
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-border bg-card p-6 shadow-card",
        className
      )}
    >
      <h3 className="mb-4 text-sm font-medium text-muted-foreground">
        Security Score
      </h3>
      
      <div className="relative">
        <svg className="h-32 w-32 -rotate-90 transform">
          {/* Background circle */}
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-secondary"
          />
          {/* Progress circle */}
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="url(#scoreGradient)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop
                offset="0%"
                className={cn("stop-color-current", getScoreColor(score))}
                style={{ stopColor: "currentColor" }}
              />
              <stop
                offset="100%"
                className={cn("stop-color-current", getScoreColor(score))}
                style={{ stopColor: "currentColor", opacity: 0.6 }}
              />
            </linearGradient>
          </defs>
        </svg>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-4xl font-bold", getScoreColor(score))}>
            {score}
          </span>
          <span className="text-xs text-muted-foreground">out of 100</span>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className={cn("text-sm font-medium", getScoreColor(score))}>
          {score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Needs Attention"}
        </p>
        <p className="text-xs text-muted-foreground">
          {endpointCount === 0 
            ? "No endpoints enrolled" 
            : `Based on ${endpointCount} active endpoint${endpointCount !== 1 ? 's' : ''}`
          }
        </p>
      </div>
    </div>
  );
}
