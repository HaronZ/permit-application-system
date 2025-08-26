"use client";
import { useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import { Chrome, Facebook, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import toast from "react-hot-toast";
import { validatePassword } from "@/lib/security";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [strength, setStrength] = useState<{score:number; label:string; color:string}>({ score: 0, label: "", color: "" });
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);

  const siteUrl = useMemo(() => {
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }, []);

  function calcStrength(pw: string) {
    const result = validatePassword(pw);
    const labels = ["", "Weak", "Fair", "Good", "Strong"];
    const colors = ["", "bg-red-500", "bg-amber-500", "bg-blue-500", "bg-emerald-600"];
    return { 
      score: result.score, 
      label: labels[result.score], 
      color: colors[result.score] 
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Rate limiting check
    if (locked) {
      toast.error("Too many failed attempts. Please try again later.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setAttempts(prev => prev + 1);
          if (attempts >= 4) {
            setLocked(true);
            setTimeout(() => setLocked(false), 15 * 60 * 1000); // 15 minutes
          }
          throw error;
        }
        // Reset attempts on successful login
        setAttempts(0);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: siteUrl ? `${siteUrl}/login` : undefined }
        });
        if (error) throw error;
        toast.success("Check your email to verify your account.");
      }
      const next = searchParams.get("next");
      router.push(next || "/");
    } catch (err: any) {
      const msg = err?.message || "Authentication failed";
      setError(msg);
      if (/email.*confirm/i.test(msg)) {
        toast.error("Email not confirmed. Please check your email and click the verification link.", {
          duration: 5000,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  const handlePasswordReset = async () => {
    if (!email) {
      toast.error("Please enter your email address first.");
      return;
    }
    try {
      await supabase.auth.resetPasswordForEmail(email, { 
        redirectTo: siteUrl ? `${siteUrl}/login` : undefined 
      });
      toast.success("Password reset email sent. Please check your inbox.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send reset email");
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'facebook') => {
    try {
      await supabase.auth.signInWithOAuth({ 
        provider, 
        options: { redirectTo: siteUrl ? `${siteUrl}` : undefined } 
      });
    } catch (e: any) {
      toast.error(e?.message || `${provider} sign-in failed`);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card variant="glass" className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-gray-600">
              {mode === "login" 
                ? "Sign in to your account to continue" 
                : "Sign up to get started with your permit applications"
              }
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              leftIcon={<Mail className="h-4 w-4" />}
              placeholder="Enter your email"
            />

            <Input
              label="Password"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (mode === "signup") {
                  setStrength(calcStrength(e.target.value));
                }
              }}
              required
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              placeholder="Enter your password"
            />

            {mode === "signup" && password && (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-2 flex-1 rounded-full transition-colors ${
                        level <= strength.score ? strength.color : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-600">
                  Password strength: <span className="font-medium">{strength.label}</span>
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full btn-primary"
              loading={loading}
              disabled={locked}
            >
              {mode === "login" ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {mode === "login" 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>

          {mode === "login" && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={handlePasswordReset}
                className="text-sm text-gray-600 hover:text-gray-700"
              >
                Forgot your password?
              </button>
            </div>
          )}

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: siteUrl ? `${siteUrl}/login` : undefined }
                })}
                leftIcon={<Chrome className="h-4 w-4" />}
              >
                Continue with Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => supabase.auth.signInWithOAuth({
                  provider: "facebook",
                  options: { redirectTo: siteUrl ? `${siteUrl}/login` : undefined }
                })}
                leftIcon={<Facebook className="h-4 w-4" />}
              >
                Continue with Facebook
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}
