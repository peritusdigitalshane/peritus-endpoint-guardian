import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield, Zap, Building2, Lock, CheckCircle2, ArrowRight, Globe, Server, Activity } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Peritus Secure</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#benefits" className="text-muted-foreground hover:text-foreground transition-colors">Benefits</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/login?mode=signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
            <Zap className="h-4 w-4" />
            No Microsoft E5 Required
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
            Endpoint Security
            <span className="block bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Made Simple
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Centrally manage, harden, monitor, and remediate Microsoft Defender across all your Windows endpoints. 
            Built for MSPs and SMBs.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-12 px-8 text-base" asChild>
              <Link to="/login?mode=signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base">
              Watch Demo
            </Button>
          </div>
          <div className="mt-16 flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-status-healthy" />
              No VPN Required
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-status-healthy" />
              No Firewall Rules
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-status-healthy" />
              Deploy in Minutes
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-border/40 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">99.9%</div>
              <div className="text-sm text-muted-foreground mt-1">Uptime SLA</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">50K+</div>
              <div className="text-sm text-muted-foreground mt-1">Endpoints Protected</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">&lt;5min</div>
              <div className="text-sm text-muted-foreground mt-1">Deployment Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">24/7</div>
              <div className="text-sm text-muted-foreground mt-1">Monitoring</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
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
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Defender Management"
              description="Configure and enforce Microsoft Defender settings across all endpoints from a single dashboard."
            />
            <FeatureCard
              icon={<Activity className="h-6 w-6" />}
              title="Real-Time Monitoring"
              description="Track endpoint health, threat detections, and security posture with live dashboards."
            />
            <FeatureCard
              icon={<Lock className="h-6 w-6" />}
              title="Policy Enforcement"
              description="Deploy security baselines and ensure compliance with industry standards."
            />
            <FeatureCard
              icon={<Server className="h-6 w-6" />}
              title="Agentless Architecture"
              description="Lightweight agent with secure outbound-only connections. No inbound firewall rules needed."
            />
            <FeatureCard
              icon={<Building2 className="h-6 w-6" />}
              title="Multi-Tenant"
              description="Manage multiple organizations from a single console. Perfect for MSPs."
            />
            <FeatureCard
              icon={<Globe className="h-6 w-6" />}
              title="Cloud-Native"
              description="No on-premises infrastructure required. Access from anywhere, anytime."
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-24 px-6 bg-muted/30">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Built for MSPs and SMBs
              </h2>
              <p className="text-muted-foreground mb-8">
                Stop paying for expensive E5 licenses just to manage Defender. Peritus Secure gives you 
                enterprise-grade endpoint security management at a fraction of the cost.
              </p>
              <ul className="space-y-4">
                <BenefitItem>No Microsoft Defender for Endpoint (E5) required</BenefitItem>
                <BenefitItem>Works with Microsoft 365 Business Basic and up</BenefitItem>
                <BenefitItem>Secure outbound-only agent connections</BenefitItem>
                <BenefitItem>Deploy across multiple tenants instantly</BenefitItem>
                <BenefitItem>Automated threat remediation workflows</BenefitItem>
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-video rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-border/40 flex items-center justify-center">
                <Shield className="h-24 w-24 text-primary/40" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Secure Your Endpoints?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Start your free 14-day trial today. No credit card required.
          </p>
          <Button size="lg" className="h-12 px-8 text-base" asChild>
            <Link to="/login?mode=signup">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/40">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">Peritus Secure</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Peritus Secure. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="p-6 rounded-xl border border-border/40 bg-card hover:border-primary/40 transition-colors">
    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm">{description}</p>
  </div>
);

const BenefitItem = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-center gap-3">
    <CheckCircle2 className="h-5 w-5 text-status-healthy flex-shrink-0" />
    <span>{children}</span>
  </li>
);

export default Landing;
