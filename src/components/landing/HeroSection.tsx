import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, CheckCircle2, ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
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
            <Link to="/signup">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-8 text-base">
            Watch Demo
          </Button>
        </div>
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
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
  );
}
