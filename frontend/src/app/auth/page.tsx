'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import LogoIcon from '@/assets/logo-icon';
import { RiArrowLeftLine, RiLoader4Line } from 'react-icons/ri';

export default function AuthPage() {
  const router = useRouter();
  const { login, signup, isAuthenticated } = useAuth();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirm, setSignupConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push('/dashboard');
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (signupPassword !== signupConfirm) {
      setError('Passwords do not match');
      return;
    }

    if (signupPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await signup(signupEmail, signupPassword);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-12 relative overflow-hidden">
      {/* Ambient colored glows */}
      <div className="absolute top-[-20%] right-[-10%] w-[320px] sm:w-[600px] h-[320px] sm:h-[600px] rounded-full bg-indigo-500/[0.06] blur-[100px] sm:blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[280px] sm:w-[500px] h-[280px] sm:h-[500px] rounded-full bg-cyan-500/[0.04] blur-[90px] sm:blur-[130px] pointer-events-none" />
      <div className="absolute top-[30%] left-[20%] w-[200px] sm:w-[350px] h-[200px] sm:h-[350px] rounded-full bg-violet-600/[0.04] blur-[80px] sm:blur-[120px] pointer-events-none" />

      {/* Back link */}
      <motion.div
        className="absolute top-4 left-4 sm:top-6 sm:left-6 md:top-8 md:left-10"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link
          href="/"
          className="flex items-center gap-1.5 sm:gap-2 text-white/40 hover:text-white/70 text-[12px] sm:text-[13px] font-medium transition-colors"
        >
          <RiArrowLeftLine className="w-4 h-4" />
          Back
        </Link>
      </motion.div>

      <motion.div
        className="w-full max-w-sm relative z-10 my-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8 sm:mb-10">
          <LogoIcon className="size-7 sm:size-8 text-white" />
          <span className="text-white text-lg sm:text-xl font-semibold tracking-tight">Cachette</span>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg p-1 mb-6 sm:mb-8">
            <TabsTrigger
              value="login"
              className="flex-1 text-[13px] font-medium rounded-md data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-white/40 transition-all"
            >
              Log In
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className="flex-1 text-[13px] font-medium rounded-md data-[state=active]:bg-white/[0.08] data-[state=active]:text-white text-white/40 transition-all"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>

          {/* Error message */}
          {error && (
            <motion.div
              className="mb-5 sm:mb-6 px-4 py-3 rounded-lg border border-red-500/20 bg-red-500/[0.06] text-red-400 text-[13px]"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {error}
            </motion.div>
          )}

          {/* Login Tab */}
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="login-email" className="text-white/50 text-[13px]">
                  Email
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus:border-white/20 h-11"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password" className="text-white/50 text-[13px]">
                    Password
                  </Label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-white/30 hover:text-white/60 text-[12px] transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus:border-white/20 h-11"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-white text-[#0a0a0a] hover:bg-white/90 rounded-lg font-semibold text-[14px] mt-2"
              >
                {loading ? (
                  <RiLoader4Line className="w-4 h-4 animate-spin" />
                ) : (
                  'Log In'
                )}
              </Button>
            </form>
          </TabsContent>

          {/* Signup Tab */}
          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4 sm:space-y-5">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="signup-email" className="text-white/50 text-[13px]">
                  Email
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus:border-white/20 h-11"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="signup-password" className="text-white/50 text-[13px]">
                  Password
                </Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus:border-white/20 h-11"
                />
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="signup-confirm" className="text-white/50 text-[13px]">
                  Confirm Password
                </Label>
                <Input
                  id="signup-confirm"
                  type="password"
                  placeholder="••••••••"
                  value={signupConfirm}
                  onChange={(e) => setSignupConfirm(e.target.value)}
                  required
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus:border-white/20 h-11"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-white text-[#0a0a0a] hover:bg-white/90 rounded-lg font-semibold text-[14px] mt-2"
              >
                {loading ? (
                  <RiLoader4Line className="w-4 h-4 animate-spin" />
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {/* Footer text */}
        <p className="text-white/20 text-[11px] sm:text-[12px] text-center mt-6 sm:mt-8">
          By continuing, you agree to our Terms and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
