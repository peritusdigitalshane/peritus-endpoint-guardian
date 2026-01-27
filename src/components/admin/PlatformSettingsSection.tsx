import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePlatformSetting, useUpdatePlatformSetting } from "@/hooks/usePlatformSettings";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, Key, Sparkles, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const PlatformSettingsSection = () => {
  const { data: openaiSetting, isLoading } = usePlatformSetting("openai_api_key");
  const updateSetting = useUpdatePlatformSetting();
  const { toast } = useToast();

  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (openaiSetting?.value) {
      setApiKey(openaiSetting.value);
    }
  }, [openaiSetting]);

  const handleSave = async () => {
    try {
      await updateSetting.mutateAsync({ key: "openai_api_key", value: apiKey });
      setHasChanges(false);
      toast({
        title: "Settings saved",
        description: "OpenAI API key has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to save",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleChange = (value: string) => {
    setApiKey(value);
    setHasChanges(value !== (openaiSetting?.value || ""));
  };

  const maskApiKey = (key: string) => {
    if (!key || key.length < 10) return key;
    return key.substring(0, 7) + "..." + key.substring(key.length - 4);
  };

  const isConfigured = !!openaiSetting?.value && openaiSetting.value.length > 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
            <Sparkles className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <CardTitle className="text-lg">AI Security Advisor</CardTitle>
            <CardDescription>
              Configure OpenAI API key for AI-powered security recommendations
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <Key className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Status:</span>
          {isConfigured ? (
            <span className="flex items-center gap-1 text-green-600">
              <Check className="h-4 w-4" />
              Configured
            </span>
          ) : (
            <span className="text-amber-600">Not configured</span>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="openai-key">OpenAI API Key</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="openai-key"
                type={showKey ? "text" : "password"}
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => handleChange(e.target.value)}
                className="pr-10 font-mono text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateSetting.isPending}
            >
              {updateSetting.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Get your API key from{" "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              platform.openai.com/api-keys
            </a>
          </p>
        </div>

        {isConfigured && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="text-muted-foreground">
              The AI Security Advisor will analyze your endpoint security posture and provide 
              prioritized recommendations to improve protection across your fleet.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
