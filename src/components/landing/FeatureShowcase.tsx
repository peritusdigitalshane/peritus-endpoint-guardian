import { 
  LayoutDashboard, Monitor, FolderOpen, Bell, AlertTriangle, ScrollText, 
  Crosshair, FileText, SlidersHorizontal, Network, Router, ShieldAlert,
  ClipboardList, Sparkles, Users, Activity, Settings, Shield, Lock,
  Eye, Zap, Search, Globe, Download, BarChart3, Layers, Radio,
  Cpu, Wifi, FileCode, Key, Terminal, BookOpen
} from "lucide-react";

interface FeatureShowcaseItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlights: string[];
  mockupType: "dashboard" | "table" | "policy" | "network" | "hunting" | "reports" | "generic";
  gradient: string;
}

const platformFeatures: FeatureShowcaseItem[] = [
  {
    icon: <LayoutDashboard className="h-6 w-6" />,
    title: "Security Dashboard",
    description: "Get a complete overview of your security posture at a glance. Real-time security scores, compliance tracking, threat counts, and endpoint health — all in one centralized view.",
    highlights: ["Security Score with actionable breakdown", "Compliance trend charts over time", "Active threat counter with severity", "Endpoint health at a glance"],
    mockupType: "dashboard",
    gradient: "from-primary/20 via-primary/10 to-transparent",
  },
  {
    icon: <Monitor className="h-6 w-6" />,
    title: "Endpoint Management",
    description: "View, search, filter, and manage every registered endpoint. See real-time online status, Defender version, agent version, OS details, and assigned policies. Export to CSV with one click.",
    highlights: ["Real-time online/offline status", "Bulk actions across endpoints", "One-click CSV export", "Per-endpoint drill-down detail view"],
    mockupType: "table",
    gradient: "from-blue-500/20 via-blue-500/10 to-transparent",
  },
  {
    icon: <FolderOpen className="h-6 w-6" />,
    title: "Endpoint Groups",
    description: "Organize endpoints into logical groups for streamlined policy assignment. Assign Defender policies, GPO policies, UAC policies, WDAC policies, and Windows Update policies per group.",
    highlights: ["Drag-and-drop group membership", "Multi-policy assignment per group", "Group-level compliance tracking", "Bulk endpoint moves"],
    mockupType: "generic",
    gradient: "from-violet-500/20 via-violet-500/10 to-transparent",
  },
  {
    icon: <Bell className="h-6 w-6" />,
    title: "Real-Time Alerts",
    description: "Receive instant alerts for security events — threat detections, policy violations, offline endpoints, and more. Acknowledge alerts, track response times, and maintain a full audit trail.",
    highlights: ["Severity-based filtering (Critical/High/Medium/Low)", "One-click acknowledge with audit trail", "Alert count badges in navigation", "Configurable alert types"],
    mockupType: "table",
    gradient: "from-red-500/20 via-red-500/10 to-transparent",
  },
  {
    icon: <AlertTriangle className="h-6 w-6" />,
    title: "Threat Detection & Remediation",
    description: "View all detected threats across your fleet with severity classification. Track threat status from detection through remediation. Resolve threats manually or automatically.",
    highlights: ["Centralized threat view across all endpoints", "Severity classification (Severe/High/Moderate/Low)", "Manual resolution workflows", "Threat history and timeline"],
    mockupType: "table",
    gradient: "from-orange-500/20 via-orange-500/10 to-transparent",
  },
  {
    icon: <ScrollText className="h-6 w-6" />,
    title: "Windows Event Log Collection",
    description: "Collect and analyze Windows event logs from every endpoint. Filter by source, severity level, event ID, and time range. Search across millions of events instantly.",
    highlights: ["Application, System, Security log sources", "Advanced filtering and search", "Event detail drill-down with raw data", "Exclusion rules to reduce noise"],
    mockupType: "table",
    gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent",
  },
  {
    icon: <Crosshair className="h-6 w-6" />,
    title: "Threat Hunting & IOC Library",
    description: "Proactively hunt for threats across your fleet. Build and manage an Indicator of Compromise (IOC) library with hashes, IPs, domains, and file names. Run hunts across all endpoints and review matches.",
    highlights: ["IOC library with hash, IP, domain, filename types", "Bulk IOC import from CSV/text", "Hunt jobs with real-time progress", "Match review and enrichment via VirusTotal"],
    mockupType: "hunting",
    gradient: "from-cyan-500/20 via-cyan-500/10 to-transparent",
  },
  {
    icon: <FileText className="h-6 w-6" />,
    title: "Defender Policy Management",
    description: "Create and manage comprehensive Microsoft Defender security policies. Configure real-time protection, cloud protection, behavior monitoring, all 16 ASR rules, exclusions, and more — all from one editor.",
    highlights: ["Full Defender setting coverage", "All 16 ASR rules with Audit/Block/Warn modes", "Path, process, and extension exclusions", "Policy assignment to endpoints and groups"],
    mockupType: "policy",
    gradient: "from-primary/20 via-primary/10 to-transparent",
  },
  {
    icon: <SlidersHorizontal className="h-6 w-6" />,
    title: "Group Policy (GPO) Management",
    description: "Full Windows Group Policy parity without Active Directory. Manage password policies, lockout policies, audit settings, security options, power management, remote desktop, and custom registry keys.",
    highlights: ["Password & account lockout policies", "9 audit categories (Success/Failure/Both)", "User rights assignments", "Custom registry settings with any type"],
    mockupType: "policy",
    gradient: "from-amber-500/20 via-amber-500/10 to-transparent",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "UAC Policy Management",
    description: "Centrally control User Account Control settings across all endpoints. Configure admin and user consent prompts, secure desktop requirements, and administrator token filtering.",
    highlights: ["Admin & standard user consent prompts", "Secure desktop enforcement", "Admin approval mode", "Installer detection settings"],
    mockupType: "policy",
    gradient: "from-indigo-500/20 via-indigo-500/10 to-transparent",
  },
  {
    icon: <Lock className="h-6 w-6" />,
    title: "Application Control (WDAC)",
    description: "Windows Defender Application Control for zero-trust application security. Discover running applications, create Publisher/Path/Hash rules, organize into Rule Sets, and transition from Audit to Enforced mode.",
    highlights: ["Auto-discover running applications", "Publisher, Path, and Hash rule types", "Reusable Rule Sets with priority ordering", "Safe Audit → Enforced transition workflow"],
    mockupType: "policy",
    gradient: "from-rose-500/20 via-rose-500/10 to-transparent",
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "Windows Update Management",
    description: "Control Windows Update behavior across your fleet. Set active hours, deferral periods for feature and quality updates, pause updates when needed, and monitor pending update counts.",
    highlights: ["Active hours configuration", "Feature & quality update deferral", "Pause/resume updates remotely", "Pending update count monitoring"],
    mockupType: "policy",
    gradient: "from-sky-500/20 via-sky-500/10 to-transparent",
  },
  {
    icon: <Network className="h-6 w-6" />,
    title: "Network Security & Firewall",
    description: "Manage firewall policies with a visual service access matrix. Run 30-day audit sessions to baseline legitimate traffic, auto-generate whitelist templates, and transition to enforce mode with confidence.",
    highlights: ["Visual service × group access matrix", "30-day audit-to-enforce workflow", "Smart traffic labeling (SMTP, RDP, SMB, etc.)", "Risk-classified observed traffic panel"],
    mockupType: "network",
    gradient: "from-teal-500/20 via-teal-500/10 to-transparent",
  },
  {
    icon: <Router className="h-6 w-6" />,
    title: "Router & VPN Management",
    description: "Onboard and manage network routers. Monitor uptime, configure DNS settings, manage VPN tunnels, and enforce firewall policies at the network edge.",
    highlights: ["Router onboarding with enrollment codes", "Uptime monitoring & health checks", "DNS management per router", "WireGuard VPN tunnel configuration"],
    mockupType: "generic",
    gradient: "from-lime-500/20 via-lime-500/10 to-transparent",
  },
  {
    icon: <ShieldAlert className="h-6 w-6" />,
    title: "Legacy OS Hardening",
    description: "For endpoints running end-of-life Windows versions (Windows 7, 8.1, Server 2012), apply hardening profiles to reduce risk without expensive Extended Security Updates (ESU).",
    highlights: ["EOL OS detection and classification", "Hardening profiles with compliance scoring", "ESU cost estimation per endpoint", "Remediation recommendations"],
    mockupType: "generic",
    gradient: "from-yellow-500/20 via-yellow-500/10 to-transparent",
  },
  {
    icon: <ClipboardList className="h-6 w-6" />,
    title: "Compliance Reports",
    description: "Generate professional security and compliance reports. Executive summaries, endpoint compliance breakdowns, threat history, and policy coverage — all exportable and shareable.",
    highlights: ["Executive summary reports", "Endpoint compliance detail", "Threat detection history", "PDF-ready report previews"],
    mockupType: "reports",
    gradient: "from-fuchsia-500/20 via-fuchsia-500/10 to-transparent",
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: "AI Security Advisor",
    description: "Get AI-powered security recommendations tailored to your environment. The advisor analyzes your configuration, threat landscape, and compliance gaps to suggest actionable improvements.",
    highlights: ["Environment-specific recommendations", "Priority-ranked action items", "One-click implementation guidance", "Continuous posture improvement"],
    mockupType: "generic",
    gradient: "from-purple-500/20 via-purple-500/10 to-transparent",
  },
  {
    icon: <Activity className="h-6 w-6" />,
    title: "Activity Audit Trail",
    description: "Complete audit trail of every action taken in the platform. Track who changed which policy, who acknowledged which alert, and who enrolled which endpoint — with timestamps and IP addresses.",
    highlights: ["Full action history with user attribution", "IP address logging", "Filterable by resource type and action", "Compliance-ready audit records"],
    mockupType: "table",
    gradient: "from-stone-500/20 via-stone-500/10 to-transparent",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "User & Role Management",
    description: "Manage platform users with role-based access control. Invite users, assign roles, and control who can view, edit, or administer security policies.",
    highlights: ["Role-based access (Admin/User)", "User invitation workflow", "Per-user activity tracking", "Enrollment code access control"],
    mockupType: "table",
    gradient: "from-pink-500/20 via-pink-500/10 to-transparent",
  },
  {
    icon: <BookOpen className="h-6 w-6" />,
    title: "Help & Best Practices",
    description: "Built-in searchable knowledge base with 70+ articles covering policy configurations, security best practices, deployment guides, and step-by-step workflows.",
    highlights: ["70+ expert-written articles", "Searchable knowledge base", "Step-by-step deployment guides", "WDAC audit-to-enforced transition guide"],
    mockupType: "generic",
    gradient: "from-emerald-500/20 via-emerald-500/10 to-transparent",
  },
];

function FeatureMockup({ feature }: { feature: FeatureShowcaseItem }) {
  const { mockupType, gradient } = feature;

  if (mockupType === "dashboard") {
    return (
      <div className={`aspect-[16/10] rounded-xl bg-gradient-to-br ${gradient} border border-border/40 p-4 flex flex-col gap-3`}>
        <div className="grid grid-cols-4 gap-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-12 rounded-lg bg-card/60 border border-border/30 flex items-center justify-center">
              <div className="w-8 h-2 rounded bg-primary/30" />
            </div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-card/60 border border-border/30 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border-4 border-primary/40" />
          </div>
          <div className="col-span-2 rounded-lg bg-card/60 border border-border/30 p-3">
            <div className="space-y-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex gap-2 items-center">
                  <div className="w-full h-2 rounded bg-primary/20" style={{ width: `${90 - i * 15}%` }} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-16 rounded-lg bg-card/60 border border-border/30" />
          <div className="h-16 rounded-lg bg-card/60 border border-border/30" />
        </div>
      </div>
    );
  }

  if (mockupType === "table") {
    return (
      <div className={`aspect-[16/10] rounded-xl bg-gradient-to-br ${gradient} border border-border/40 p-4 flex flex-col gap-2`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="h-7 w-24 rounded-md bg-primary/20" />
          <div className="h-7 w-32 rounded-md bg-card/60 border border-border/30 ml-auto" />
        </div>
        <div className="flex-1 rounded-lg bg-card/60 border border-border/30 overflow-hidden">
          <div className="h-8 bg-muted/40 border-b border-border/30 flex items-center px-3 gap-4">
            {["w-20","w-16","w-24","w-14","w-12"].map((w, i) => (
              <div key={i} className={`h-2 rounded ${w} bg-muted-foreground/20`} />
            ))}
          </div>
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-10 border-b border-border/20 flex items-center px-3 gap-4">
              {["w-20","w-16","w-24","w-14","w-12"].map((w, j) => (
                <div key={j} className={`h-2 rounded ${w} bg-foreground/10`} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (mockupType === "policy") {
    return (
      <div className={`aspect-[16/10] rounded-xl bg-gradient-to-br ${gradient} border border-border/40 p-4 flex flex-col gap-3`}>
        <div className="flex items-center gap-2">
          <div className="h-7 w-32 rounded-md bg-primary/20" />
          <div className="h-7 w-20 rounded-md bg-primary/30 ml-auto" />
        </div>
        <div className="flex-1 space-y-2">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-card/60 border border-border/30">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-primary/30" />
                <div className="h-2 w-28 rounded bg-foreground/15" />
              </div>
              <div className="w-8 h-4 rounded-full bg-primary/30" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (mockupType === "network") {
    return (
      <div className={`aspect-[16/10] rounded-xl bg-gradient-to-br ${gradient} border border-border/40 p-4 flex flex-col gap-3`}>
        <div className="flex items-center gap-2">
          <div className="h-6 w-20 rounded bg-primary/20" />
          <div className="h-6 w-20 rounded bg-card/60 border border-border/30" />
          <div className="h-6 w-20 rounded bg-card/60 border border-border/30" />
        </div>
        <div className="flex-1 rounded-lg bg-card/60 border border-border/30 p-3">
          <div className="grid grid-cols-5 gap-1">
            <div className="h-6 rounded bg-muted/40" />
            {[1,2,3,4].map(i => (
              <div key={i} className="h-6 rounded bg-muted/30 flex items-center justify-center">
                <div className="w-4 h-2 rounded bg-primary/20" />
              </div>
            ))}
            {[1,2,3].map(row => (
              <>
                <div key={`label-${row}`} className="h-8 rounded bg-muted/20 flex items-center px-1">
                  <div className="w-12 h-2 rounded bg-foreground/10" />
                </div>
                {[1,2,3,4].map(col => (
                  <div key={`${row}-${col}`} className="h-8 rounded flex items-center justify-center">
                    <div className={`w-3 h-3 rounded-full ${col % 2 === 0 ? 'bg-status-healthy/40' : 'bg-destructive/30'}`} />
                  </div>
                ))}
              </>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (mockupType === "hunting") {
    return (
      <div className={`aspect-[16/10] rounded-xl bg-gradient-to-br ${gradient} border border-border/40 p-4 flex flex-col gap-3`}>
        <div className="flex items-center gap-2">
          <div className="h-7 flex-1 rounded-md bg-card/60 border border-border/30 flex items-center px-2">
            <Search className="h-3 w-3 text-muted-foreground/40 mr-1" />
            <div className="h-2 w-20 rounded bg-foreground/10" />
          </div>
          <div className="h-7 w-24 rounded-md bg-primary/20" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["Hash", "IP", "Domain"].map(type => (
            <div key={type} className="p-2 rounded-lg bg-card/60 border border-border/30 text-center">
              <div className="text-[10px] text-muted-foreground/60 mb-1">{type}</div>
              <div className="text-sm font-medium text-foreground/40">{Math.floor(Math.random() * 50) + 10}</div>
            </div>
          ))}
        </div>
        <div className="flex-1 space-y-1.5">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-card/60 border border-border/30">
              <div className={`w-2 h-2 rounded-full ${i === 1 ? 'bg-destructive/60' : 'bg-status-healthy/40'}`} />
              <div className="h-2 w-32 rounded bg-foreground/10" />
              <div className="h-4 w-14 rounded bg-primary/20 ml-auto text-[8px] flex items-center justify-center text-primary/60">
                {i === 1 ? 'Match' : 'Clean'}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (mockupType === "reports") {
    return (
      <div className={`aspect-[16/10] rounded-xl bg-gradient-to-br ${gradient} border border-border/40 p-4 flex gap-3`}>
        <div className="w-1/3 space-y-2">
          {["Executive Summary", "Compliance", "Threats", "Endpoints"].map(label => (
            <div key={label} className="p-2 rounded-lg bg-card/60 border border-border/30">
              <div className="text-[9px] text-foreground/40">{label}</div>
            </div>
          ))}
          <div className="h-7 w-full rounded-md bg-primary/20 flex items-center justify-center">
            <div className="text-[9px] text-primary/60">Generate</div>
          </div>
        </div>
        <div className="flex-1 rounded-lg bg-card/80 border border-border/30 p-3">
          <div className="h-3 w-24 rounded bg-foreground/15 mb-3" />
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-2 rounded bg-foreground/8" style={{ width: `${100 - i * 8}%` }} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="h-16 rounded bg-primary/10" />
            <div className="h-16 rounded bg-primary/10" />
          </div>
        </div>
      </div>
    );
  }

  // Generic
  return (
    <div className={`aspect-[16/10] rounded-xl bg-gradient-to-br ${gradient} border border-border/40 p-4 flex flex-col gap-3`}>
      <div className="flex items-center gap-2">
        <div className="h-7 w-28 rounded-md bg-primary/20" />
        <div className="h-7 w-20 rounded-md bg-card/60 border border-border/30 ml-auto" />
      </div>
      <div className="flex-1 grid grid-cols-2 gap-2">
        {[1,2,3,4].map(i => (
          <div key={i} className="rounded-lg bg-card/60 border border-border/30 p-3 flex flex-col justify-between">
            <div className="h-2 w-16 rounded bg-foreground/15" />
            <div className="h-2 w-10 rounded bg-primary/20 mt-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function FeatureShowcase() {
  return (
    <section id="platform" className="py-24 px-6">
      <div className="container mx-auto">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Eye className="h-4 w-4" />
            Complete Platform Tour
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Every Feature, One Platform
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From real-time dashboards to AI-powered recommendations — here's everything 
            Peritus Threat Defence brings to your security operations.
          </p>
        </div>

        <div className="space-y-24">
          {platformFeatures.map((feature, index) => (
            <div
              key={feature.title}
              className={`grid lg:grid-cols-2 gap-12 items-center ${
                index % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold">{feature.title}</h3>
                </div>
                <p className="text-muted-foreground mb-6 leading-relaxed">{feature.description}</p>
                <ul className="space-y-3">
                  {feature.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-3">
                      <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                      <span className="text-sm">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={index % 2 === 1 ? "lg:order-1" : ""}>
                <FeatureMockup feature={feature} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
