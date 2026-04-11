import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

interface Finding {
  id: string;
  cve_id: string;
  severity: string;
  cvss_score: number | null;
  affected_software: string;
  affected_version: string | null;
  description: string | null;
  endpoints?: { hostname: string } | null;
}

interface CveMitigationSheetProps {
  finding: Finding | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CveMitigationSheet({
  finding,
  open,
  onOpenChange,
}: CveMitigationSheetProps) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchAdvice = async () => {
    if (!finding) return;
    setIsLoading(true);
    setAdvice(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        "cve-mitigation-advisor",
        {
          body: {
            cve_id: finding.cve_id,
            severity: finding.severity,
            cvss_score: finding.cvss_score,
            affected_software: finding.affected_software,
            affected_version: finding.affected_version,
            description: finding.description,
            hostname: (finding.endpoints as any)?.hostname || "Unknown",
          },
        }
      );

      if (error) throw error;

      if (data?.error) {
        toast({
          title: "AI Advisor Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setAdvice(data.advice);
    } catch (err: any) {
      toast({
        title: "Failed to get advice",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (value: boolean) => {
    onOpenChange(value);
    if (value && !advice && !isLoading) {
      fetchAdvice();
    }
    if (!value) {
      setAdvice(null);
    }
  };

  const severityColors: Record<string, string> = {
    critical: "bg-red-500/10 text-red-500 border-red-500/20",
    high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        {finding && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Mitigation Advice
              </SheetTitle>
              <SheetDescription className="space-y-2">
                <div className="flex items-center gap-2 mt-2">
                  <a
                    href={`https://nvd.nist.gov/vuln/detail/${finding.cve_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    {finding.cve_id}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <Badge
                    variant="outline"
                    className={severityColors[finding.severity] || ""}
                  >
                    {finding.severity}
                  </Badge>
                  {finding.cvss_score !== null && (
                    <span className="font-mono text-xs text-muted-foreground">
                      CVSS {finding.cvss_score}
                    </span>
                  )}
                </div>
                <p className="text-sm">
                  {finding.affected_software}
                  {finding.affected_version
                    ? ` v${finding.affected_version}`
                    : ""}
                </p>
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Analyzing CVE and generating platform-specific advice…
                  </p>
                </div>
              ) : advice ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{advice}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <p className="text-sm text-muted-foreground">
                    No advice loaded.
                  </p>
                  <Button onClick={fetchAdvice}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Get AI Advice
                  </Button>
                </div>
              )}

              {advice && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchAdvice}
                    disabled={isLoading}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Regenerate
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
