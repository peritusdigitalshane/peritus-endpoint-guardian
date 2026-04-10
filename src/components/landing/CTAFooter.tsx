import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-24 px-6 bg-muted/30">
      <div className="container mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Ready to Secure Your Endpoints?
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-8">
          Start your free 14-day trial today. No credit card required.
        </p>
        <Button size="lg" className="h-12 px-8 text-base" asChild>
          <Link to="/signup">
            Get Started Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="py-12 px-6 border-t border-border/40">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">Peritus Threat Defence</span>
          </div>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Peritus Threat Defence. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
