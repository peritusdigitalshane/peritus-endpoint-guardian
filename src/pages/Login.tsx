import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2, ArrowLeft, CheckCircle, XCircle, Building2 } from "lucide-react";
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const validateCode = useValidateEnrollmentCode();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Validate code when it changes (debounced)
  useEffect(() => {
    if (!isSignUp || !enrollmentCode.trim()) {
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
  }, [enrollmentCode, isSignUp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Require valid enrollment code for signup
        if (!codeValidation?.isValid) {
          toast({
            title: "Invalid enrollment code",
            description: "Please enter a valid enrollment code to sign up.",
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
              enrollment_code: enrollmentCode.trim().toUpperCase(),
            },
          },
        });

        if (error) throw error;

        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link to complete your signup.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
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

  const canSignUp = isSignUp && codeValidation?.isValid && displayName.trim() && email.trim() && password.length >= 6;

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
                ? "Enter your enrollment code to get started"
                : "Sign in to your Peritus Threat Defence account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <>
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
                        required
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
