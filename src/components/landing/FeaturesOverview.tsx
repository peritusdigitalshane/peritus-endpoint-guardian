import { Shield, Activity, Lock, Server, Building2, Globe } from "lucide-react";

export function FeaturesOverview() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to Secure Your Fleet
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Comprehensive endpoint security management without the complexity of enterprise solutions.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { icon: <Shield className="h-6 w-6" />, title: "Defender Management", description: "Configure and enforce Microsoft Defender settings across all endpoints from a single dashboard." },
            { icon: <Activity className="h-6 w-6" />, title: "Real-Time Monitoring", description: "Track endpoint health, threat detections, and security posture with live dashboards." },
            { icon: <Lock className="h-6 w-6" />, title: "Policy Enforcement", description: "Deploy security baselines and ensure compliance with industry standards." },
            { icon: <Server className="h-6 w-6" />, title: "Agentless Architecture", description: "Lightweight agent with secure outbound-only connections. No inbound firewall rules needed." },
            { icon: <Building2 className="h-6 w-6" />, title: "Multi-Tenant", description: "Manage multiple organizations from a single console. Perfect for MSPs." },
            { icon: <Globe className="h-6 w-6" />, title: "Cloud-Native", description: "No on-premises infrastructure required. Access from anywhere, anytime." },
          ].map(feature => (
            <div key={feature.title} className="p-6 rounded-xl border border-border/40 bg-card hover:border-primary/40 transition-colors">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
