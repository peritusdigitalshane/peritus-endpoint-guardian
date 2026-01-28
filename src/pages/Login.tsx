import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Loader2, ArrowLeft, CheckCircle, XCircle, Building2, Smartphone, Info, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useValidateEnrollmentCode } from "@/hooks/useEnrollmentCodes";

const Login = () => {
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [enrollmentCode, setEnrollmentCode] = useState(searchParams.get("code") || "");
  const [isLoading, setIsLoading] = useState(false);
  const [codeValidation, setCodeValidation] = useState<{
    isValid: boolean;
    orgName: string | null;
    error: string | null;
  } | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  
  // Free trial option
  const [useFreeTrialSign, setUseFreeTrial] = useState(false);
  
  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [isVerifyingMfa, setIsVerifyingMfa] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const validateCode = useValidateEnrollmentCode();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check MFA status
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalData?.currentLevel === "aal1" && aalData?.nextLevel === "aal2") {
          // User has MFA enabled but hasn't completed it
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const totpFactor = factors?.totp?.find(f => f.status === "verified");
          if (totpFactor) {
            setMfaRequired(true);
            setMfaFactorId(totpFactor.id);
            return;
          }
        }
        navigate("/dashboard");
      }
    };
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && event === "SIGNED_IN") {
        // Check if MFA is required
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalData?.currentLevel === "aal1" && aalData?.nextLevel === "aal2") {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const totpFactor = factors?.totp?.find(f => f.status === "verified");
          if (totpFactor) {
            setMfaRequired(true);
            setMfaFactorId(totpFactor.id);
            return;
          }
        }
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Validate code when it changes (debounced) - skip if using free trial
  useEffect(() => {
    if (!isSignUp || useFreeTrialSign || !enrollmentCode.trim()) {
      setCodeValidation(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsValidatingCode(true);
      try {
        const result = await validateCode.mutateAsync(enrollmentCode.trim().toUpperCase());
        setCodeValidation({
          isValid: result.is_valid,
          orgName: result.organization_name,
          error: result.error_message,
        });
      } catch (error) {
        setCodeValidation({
          isValid: false,
          orgName: null,
          error: "Failed to validate code",
        });
      } finally {
        setIsValidatingCode(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [enrollmentCode, isSignUp, useFreeTrialSign]);

  const handleMfaVerify = async () => {
    if (!mfaFactorId || mfaCode.length !== 6) return;
    
    setIsVerifyingMfa(true);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      });
      
      if (challengeError) throw challengeError;
      
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challengeData.id,
        code: mfaCode,
      });
      
      if (verifyError) throw verifyError;
      
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
      setMfaCode("");
    } finally {
      setIsVerifyingMfa(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        // For free trial, skip enrollment code validation
        if (!useFreeTrialSign && !codeValidation?.isValid) {
          toast({
            title: "Invalid enrollment code",
            description: "Please enter a valid enrollment code or select 'Start free trial'.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: displayName,
              // Only include enrollment code if not using free trial
              ...(useFreeTrialSign ? {} : { enrollment_code: enrollmentCode.trim().toUpperCase() }),
            },
          },
        });

        if (error) throw error;

        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link to complete your signup.",
        });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        // Check if MFA is required after successful password auth
        if (data.session) {
          const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (aalData?.currentLevel === "aal1" && aalData?.nextLevel === "aal2") {
            const { data: factors } = await supabase.auth.mfa.listFactors();
            const totpFactor = factors?.totp?.find(f => f.status === "verified");
            if (totpFactor) {
              setMfaRequired(true);
              setMfaFactorId(totpFactor.id);
              setIsLoading(false);
              return;
            }
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canSignUp = isSignUp && displayName.trim() && email.trim() && password.length >= 6 && 
    (useFreeTrialSign || codeValidation?.isValid);

  // MFA Challenge Screen
  if (mfaRequired) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="p-6">
          <button 
            onClick={() => {
              supabase.auth.signOut();
              setMfaRequired(false);
              setMfaFactorId(null);
              setMfaCode("");
            }}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Cancel and sign out
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-20">
          <Card className="w-full max-w-md border-border/40">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-4">
                <Smartphone className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
              <CardDescription>
                Enter the 6-digit code from your authenticator app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Open your authenticator app (Google Authenticator, Authy, etc.) and enter the current code.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="mfa-code">Authentication Code</Label>
                <Input
                  id="mfa-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-widest font-mono"
                  autoFocus
                />
              </div>

              <Button 
                onClick={handleMfaVerify}
                className="w-full"
                disabled={mfaCode.length !== 6 || isVerifyingMfa}
              >
                {isVerifyingMfa && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Back Link */}
      <div className="p-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 pb-20">
        <Card className="w-full max-w-md border-border/40">
          <CardHeader className="text-center pb-8">
            <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">
              {isSignUp ? "Create your account" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {isSignUp
                ? "Start your free trial or enter an enrollment code"
                : "Sign in to your Peritus Threat Defence account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <>
                  {/* Free Trial Option */}
                  <div 
                    className={`p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                      useFreeTrialSign 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-muted-foreground/50"
                    }`}
                    onClick={() => setUseFreeTrial(!useFreeTrialSign)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        id="freeTrial"
                        checked={useFreeTrialSign}
                        onCheckedChange={(checked) => setUseFreeTrial(checked === true)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <label 
                          htmlFor="freeTrial" 
                          className="flex items-center gap-2 font-medium cursor-pointer"
                        >
                          <Sparkles className="h-4 w-4 text-primary" />
                          Start free trial
                        </label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Get started with 1 device at no cost. No credit card required.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Enrollment Code - only show if not using free trial */}
                  {!useFreeTrialSign && (
                    <div className="space-y-2">
                      <Label htmlFor="enrollmentCode">Enrollment Code</Label>
                      <div className="relative">
                        <Input
                          id="enrollmentCode"
                          type="text"
                          placeholder="XXXXXXXX"
                          value={enrollmentCode}
                          onChange={(e) => setEnrollmentCode(e.target.value.toUpperCase())}
                          className="uppercase font-mono pr-10"
                          maxLength={8}
                          required={!useFreeTrialSign}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {isValidatingCode && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          {!isValidatingCode && codeValidation?.isValid && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          {!isValidatingCode && codeValidation && !codeValidation.isValid && (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                      </div>
                      {codeValidation?.isValid && codeValidation.orgName && (
                        <div className="flex items-center gap-2 text-sm text-green-600 mt-1">
                          <Building2 className="h-4 w-4" />
                          You will join: {codeValidation.orgName}
                        </div>
                      )}
                      {codeValidation && !codeValidation.isValid && (
                        <p className="text-sm text-destructive mt-1">
                          {codeValidation.error}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="displayName">Your Name</Label>
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="John Doe"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || (isSignUp && !canSignUp)}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSignUp ? "Create Account" : "Sign In"}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm">
              {isSignUp ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(false)}
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  Have an enrollment code?{" "}
                  <button
                    type="button"
                    onClick={() => setIsSignUp(true)}
                    className="text-primary hover:underline font-medium"
                  >
                    Create account
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
