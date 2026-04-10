import { CheckCircle2, Building2, Shield } from "lucide-react";

export function MSPSection() {
  return (
    <section id="msp" className="py-24 px-6">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Built for MSPs and SMBs
            </h2>
            <p className="text-muted-foreground mb-8">
              Stop paying for expensive E5 licenses just to manage Defender. Peritus Threat Defence gives you
              enterprise-grade endpoint security management at a fraction of the cost.
            </p>
            <ul className="space-y-4">
              {[
                "No Microsoft Defender for Endpoint (E5) required",
                "Works with Microsoft 365 Business Basic and up",
                "Secure outbound-only agent connections",
                "Deploy across multiple tenants instantly",
                "Automated threat remediation workflows",
                "All 16 ASR rules configurable per policy",
                "WDAC application control with Rule Sets",
                "Full GPO management without Active Directory",
                "Network firewall audit-to-enforce workflow",
                "AI-powered security recommendations",
                "Comprehensive compliance reporting",
                "Built-in knowledge base with 70+ articles",
              ].map((benefit) => (
                <li key={benefit} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-status-healthy flex-shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-6">
            <div className="rounded-xl border border-border/40 bg-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Multi-Tenant Management</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Manage unlimited client organizations from a single super-admin console. Switch between tenants instantly,
                impersonate tenant views, and maintain full isolation between clients.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {["Tenant Switching", "Impersonation Mode", "Partner Portal", "Enrollment Codes"].map(item => (
                  <div key={item} className="p-2 rounded-lg bg-muted/50 text-xs text-center font-medium">{item}</div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border/40 bg-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Agent Architecture</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Lightweight PowerShell-based agent with secure outbound-only HTTPS connections. No VPN, no firewall rules,
                no open ports. Deploys in under 5 minutes via a single command.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {["Outbound-Only HTTPS", "Auto-Update", "Tamper Resistant", "One-Line Deploy"].map(item => (
                  <div key={item} className="p-2 rounded-lg bg-muted/50 text-xs text-center font-medium">{item}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
