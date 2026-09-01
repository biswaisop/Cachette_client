'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import LogoIcon from '@/assets/logo-icon';
import { apiForgotPassword, apiResetPassword } from '@/lib/api';
import {
  RiArrowLeftLine,
  RiLoader4Line,
  RiMailSendLine,
  RiShieldKeyholeLine,
  RiCheckDoubleLine,
  RiLockPasswordLine,
} from 'react-icons/ri';

type Step = 'email' | 'otp' | 'password' | 'success';

// ─── Floating particles background ──────────────────────────────
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-white/[0.08]"
          style={{
            left: `${15 + i * 14}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.08, 0.2, 0.08],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 4 + i * 0.8,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.6,
          }}
        />
      ))}
    </div>
  );
}

// ─── Animated step indicator ────────────────────────────────────
function StepIndicator({ currentStep }: { currentStep: Step }) {
  const steps: Step[] = ['email', 'otp', 'password', 'success'];
  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, i) => (
        <motion.div
          key={step}
          className="relative flex items-center"
        >
          <motion.div
            className={`w-2 h-2 rounded-full ${
              i <= currentIndex ? 'bg-white' : 'bg-white/[0.12]'
            }`}
            animate={{
              scale: i === currentIndex ? [1, 1.3, 1] : 1,
            }}
            transition={{
              duration: 2,
              repeat: i === currentIndex ? Infinity : 0,
              ease: 'easeInOut',
            }}
          />
          {i < steps.length - 1 && (
            <motion.div
              className="w-8 h-[1px] mx-1"
              initial={{ scaleX: 0 }}
              animate={{
                scaleX: 1,
                backgroundColor:
                  i < currentIndex
                    ? 'rgba(255,255,255,0.4)'
                    : 'rgba(255,255,255,0.08)',
              }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{ originX: 0 }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}

// ─── OTP Input ──────────────────────────────────────────────────
function OtpInput({
  value,
  onChange,
  length = 6,
}: {
  value: string;
  onChange: (val: string) => void;
  length?: number;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, char: string) => {
    if (!/^\d*$/.test(char)) return;
    const newValue = value.split('');
    newValue[index] = char;
    const joined = newValue.join('').slice(0, length);
    onChange(joined);

    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pasted);
    const focusIndex = Math.min(pasted.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex gap-1.5 sm:gap-2 justify-center">
      {Array.from({ length }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
        >
          <input
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] || ''}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className="w-10 sm:w-11 h-12 sm:h-13 text-center text-base sm:text-lg font-semibold rounded-lg
              bg-white/[0.04] border border-white/[0.08] text-white
              focus:border-white/30 focus:bg-white/[0.06]
              outline-none transition-all duration-200
              placeholder:text-white/10 caret-white/60"
            autoComplete="one-time-code"
          />
        </motion.div>
      ))}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSendOtp = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiForgotPassword(email);
      setStep('otp');
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  }, [email]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      await apiForgotPassword(email);
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp.length < 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setStep('password');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await apiResetPassword(email, otp, newPassword);
      setStep('success');
    } catch (err: any) {
      if (err.message?.includes('Invalid or expired')) {
        setError('Invalid or expired code. Please request a new one.');
        setStep('otp');
        setOtp('');
      } else if (err.message?.includes('Too many attempts')) {
        setError('Too many attempts. Please request a new code.');
        setStep('otp');
        setOtp('');
      } else {
        setError(err.message || 'Failed to reset password');
      }
    } finally {
      setLoading(false);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 40 : -40,
      opacity: 0,
      filter: 'blur(4px)',
    }),
    center: {
      x: 0,
      opacity: 1,
      filter: 'blur(0px)',
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -40 : 40,
      opacity: 0,
      filter: 'blur(4px)',
    }),
  };

  const stepOrder: Step[] = ['email', 'otp', 'password', 'success'];
  const currentIndex = stepOrder.indexOf(step);

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-12 relative overflow-hidden">
      {/* Ambient colored glows */}
      <motion.div
        className="absolute top-[-20%] right-[-10%] w-[320px] sm:w-[600px] h-[320px] sm:h-[600px] rounded-full bg-indigo-500/[0.06] blur-[100px] sm:blur-[150px] pointer-events-none"
        animate={{
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-15%] left-[-10%] w-[280px] sm:w-[500px] h-[280px] sm:h-[500px] rounded-full bg-cyan-500/[0.04] blur-[90px] sm:blur-[130px] pointer-events-none"
        animate={{
          x: [0, -20, 0],
          y: [0, 25, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[30%] left-[20%] w-[200px] sm:w-[350px] h-[200px] sm:h-[350px] rounded-full bg-violet-600/[0.04] blur-[80px] sm:blur-[120px] pointer-events-none"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.04, 0.06, 0.04],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <FloatingParticles />

      {/* Back link */}
      <motion.div
        className="absolute top-4 left-4 sm:top-6 sm:left-6 md:top-8 md:left-10"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link
          href="/auth"
          className="flex items-center gap-1.5 sm:gap-2 text-white/40 hover:text-white/70 text-[12px] sm:text-[13px] font-medium transition-colors"
        >
          <RiArrowLeftLine className="w-4 h-4" />
          Back to login
        </Link>
      </motion.div>

      <motion.div
        className="w-full max-w-sm relative z-10 my-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <LogoIcon className="size-7 sm:size-8 text-white" />
          <span className="text-white text-lg sm:text-xl font-semibold tracking-tight">Cachette</span>
        </div>

        <StepIndicator currentStep={step} />

        {/* Error message */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error"
              className="mb-6 px-4 py-3 rounded-lg border border-red-500/20 bg-red-500/[0.06] text-red-400 text-[13px]"
              initial={{ opacity: 0, y: -5, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -5, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step content */}
        <AnimatePresence mode="wait" custom={1}>
          {/* ─── Step 1: Email ───────────────────────────── */}
          {step === 'email' && (
            <motion.div
              key="email"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {/* Icon */}
              <div className="flex justify-center mb-5">
                <motion.div
                  className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center"
                  animate={{
                    boxShadow: [
                      '0 0 0 0 rgba(255,255,255,0)',
                      '0 0 20px 2px rgba(255,255,255,0.04)',
                      '0 0 0 0 rgba(255,255,255,0)',
                    ],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <RiMailSendLine className="w-6 h-6 text-white/60" />
                </motion.div>
              </div>

              <h1 className="text-white text-[18px] font-semibold text-center mb-1.5">
                Forgot your password?
              </h1>
              <p className="text-white/40 text-[13px] text-center mb-7 leading-relaxed">
                Enter the email address associated with your account and we&apos;ll send you a verification code.
              </p>

              <form onSubmit={handleSendOtp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="text-white/50 text-[13px]">
                    Email address
                  </Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus:border-white/20 h-11"
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-white text-[#0a0a0a] hover:bg-white/90 rounded-lg font-semibold text-[14px]"
                >
                  {loading ? (
                    <RiLoader4Line className="w-4 h-4 animate-spin" />
                  ) : (
                    'Send Verification Code'
                  )}
                </Button>
              </form>
            </motion.div>
          )}

          {/* ─── Step 2: OTP ─────────────────────────────── */}
          {step === 'otp' && (
            <motion.div
              key="otp"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {/* Icon */}
              <div className="flex justify-center mb-5">
                <motion.div
                  className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <RiShieldKeyholeLine className="w-6 h-6 text-white/60" />
                </motion.div>
              </div>

              <h1 className="text-white text-[18px] font-semibold text-center mb-1.5">
                Enter verification code
              </h1>
              <p className="text-white/40 text-[13px] text-center mb-7 leading-relaxed">
                We sent a 6-digit code to{' '}
                <span className="text-white/60 font-medium">{email}</span>
              </p>

              <form onSubmit={handleVerifyAndSetPassword} className="space-y-6">
                <OtpInput value={otp} onChange={setOtp} />

                <Button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full h-11 bg-white text-[#0a0a0a] hover:bg-white/90 rounded-lg font-semibold text-[14px] disabled:opacity-40"
                >
                  {loading ? (
                    <RiLoader4Line className="w-4 h-4 animate-spin" />
                  ) : (
                    'Verify Code'
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || loading}
                    className="text-[13px] text-white/40 hover:text-white/60 transition-colors disabled:cursor-not-allowed"
                  >
                    {resendCooldown > 0 ? (
                      <span>
                        Resend code in{' '}
                        <span className="text-white/60 font-medium tabular-nums">
                          {resendCooldown}s
                        </span>
                      </span>
                    ) : (
                      "Didn't receive a code? Resend"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* ─── Step 3: New password ────────────────────── */}
          {step === 'password' && (
            <motion.div
              key="password"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: 'easeOut' }}
            >
              {/* Icon */}
              <div className="flex justify-center mb-5">
                <motion.div
                  className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center"
                  animate={{
                    y: [0, -4, 0],
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <RiLockPasswordLine className="w-6 h-6 text-white/60" />
                </motion.div>
              </div>

              <h1 className="text-white text-[18px] font-semibold text-center mb-1.5">
                Set new password
              </h1>
              <p className="text-white/40 text-[13px] text-center mb-7 leading-relaxed">
                Choose a strong password for your account. Must be at least 6 characters.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-white/50 text-[13px]">
                    New password
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus:border-white/20 h-11"
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password" className="text-white/50 text-[13px]">
                    Confirm password
                  </Label>
                  <Input
                    id="confirm-new-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus:border-white/20 h-11"
                  />
                </div>

                {/* Password strength hint */}
                {newPassword.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2"
                  >
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4].map((segment) => {
                        const strength =
                          newPassword.length >= 12
                            ? 4
                            : newPassword.length >= 8
                            ? 3
                            : newPassword.length >= 6
                            ? 2
                            : 1;
                        return (
                          <motion.div
                            key={segment}
                            className={`h-1 flex-1 rounded-full ${
                              segment <= strength
                                ? strength <= 1
                                  ? 'bg-red-400/60'
                                  : strength <= 2
                                  ? 'bg-amber-400/60'
                                  : strength <= 3
                                  ? 'bg-emerald-400/50'
                                  : 'bg-emerald-400/70'
                                : 'bg-white/[0.06]'
                            }`}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ delay: segment * 0.05 }}
                            style={{ originX: 0 }}
                          />
                        );
                      })}
                    </div>
                    <p className="text-white/30 text-[11px]">
                      {newPassword.length < 6
                        ? 'Too short'
                        : newPassword.length < 8
                        ? 'Fair'
                        : newPassword.length < 12
                        ? 'Good'
                        : 'Strong'}
                    </p>
                  </motion.div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-white text-[#0a0a0a] hover:bg-white/90 rounded-lg font-semibold text-[14px]"
                >
                  {loading ? (
                    <RiLoader4Line className="w-4 h-4 animate-spin" />
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </form>
            </motion.div>
          )}

          {/* ─── Step 4: Success ──────────────────────────── */}
          {step === 'success' && (
            <motion.div
              key="success"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="text-center"
            >
              {/* Animated success icon */}
              <div className="flex justify-center mb-6">
                <motion.div
                  className="relative w-20 h-20 flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                    delay: 0.1,
                  }}
                >
                  {/* Pulsing rings */}
                  <motion.div
                    className="absolute inset-0 rounded-full border border-emerald-500/20"
                    animate={{
                      scale: [1, 1.4, 1.4],
                      opacity: [0.3, 0, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeOut',
                    }}
                  />
                  <motion.div
                    className="absolute inset-0 rounded-full border border-emerald-500/10"
                    animate={{
                      scale: [1, 1.7, 1.7],
                      opacity: [0.2, 0, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeOut',
                      delay: 0.3,
                    }}
                  />
                  <div className="w-16 h-16 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: 'spring',
                        stiffness: 200,
                        damping: 12,
                        delay: 0.3,
                      }}
                    >
                      <RiCheckDoubleLine className="w-7 h-7 text-emerald-400" />
                    </motion.div>
                  </div>
                </motion.div>
              </div>

              <motion.h1
                className="text-white text-[18px] font-semibold mb-1.5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                Password reset successful
              </motion.h1>
              <motion.p
                className="text-white/40 text-[13px] mb-8 leading-relaxed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Your password has been updated. You can now log in with your new credentials.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button
                  onClick={() => router.push('/auth')}
                  className="w-full h-11 bg-white text-[#0a0a0a] hover:bg-white/90 rounded-lg font-semibold text-[14px]"
                >
                  Back to Log In
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.p
          className="text-white/20 text-[12px] text-center mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Remember your password?{' '}
          <Link href="/auth" className="text-white/40 hover:text-white/60 transition-colors">
            Log in
          </Link>
        </motion.p>
      </motion.div>
    </div>
  );
}
