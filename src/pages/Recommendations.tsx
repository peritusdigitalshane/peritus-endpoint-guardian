import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw } from "lucide-react";

const Recommendations = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI Security Advisor</h1>
            <p className="text-muted-foreground">
              AI-powered recommendations to improve your security posture
            </p>
          </div>
          <Button disabled>
            <RefreshCw className="mr-2 h-4 w-4" />
            Generate Recommendations
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Recommendations
            </CardTitle>
            <CardDescription>
              Configure your OpenAI API key in Admin settings to enable AI-powered security recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                AI Security Advisor Coming Soon
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Once configured, the AI Security Advisor will analyze your endpoint security data, 
                threat patterns, and compliance status to provide actionable recommendations.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Recommendations;
