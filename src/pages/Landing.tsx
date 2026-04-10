import { LandingNav } from "@/components/landing/LandingNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { FeaturesOverview } from "@/components/landing/FeaturesOverview";
import { FeatureShowcase } from "@/components/landing/FeatureShowcase";
import { ProtectionSection } from "@/components/landing/ProtectionSection";
import { MSPSection } from "@/components/landing/MSPSection";
import { CTASection, Footer } from "@/components/landing/CTAFooter";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <HeroSection />
      <StatsSection />
      <FeaturesOverview />
      <FeatureShowcase />
      <ProtectionSection />
      <MSPSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Landing;
