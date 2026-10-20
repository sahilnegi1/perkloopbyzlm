"use client";

/**
 * Auth flow (OTP by email or Indian mobile) — steps: target → otp → business.
 * Honest dev mode: when the backend has no SMS/SMTP provider it returns
 * { devMode: true, devCode } and this UI says so plainly (amber banner).
 */

import { useEffect, useRef, useState } from "react";
import { get, post, ApiError } from "@/lib/api";
import { navigate } from "@/lib/hash-router";
import { useSession, type SessionUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Spinner } from "@/components/customer/shared";
import { cn } from "@/lib/utils";
import { BusinessRegisterForm } from "@/components/auth/BusinessRegisterForm";
import { KeyRound, Mail, RefreshCw, Smartphone, TriangleAlert } from "lucide-react";

type RoleToggle = "customer" | "merchant";
type ModeToggle = "login" | "register";
type Channel = "EMAIL" | "SMS";
type Step = "target" | "otp" | "business";

const PHONE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Strips spaces/dashes and +91/91/0 prefixes → bare 10-digit mobile. */
function normalizePhone(raw: string): string {
  return raw
    .replace(/[\s()\-]/g, "")
    .replace(/^\+91/, "")
    .replace(/^91(?=[6-9]\d{9}$)/, "")
    .replace(/^0(?=[6-9]\d{9})/, "");
}

/** Deep links worth returning to after sign-in (never #/auth itself). */
function consumeReturnPath(): string | null {
  try {
    const ret = sessionStorage.getItem("pl_return_to");
    sessionStorage.removeItem("pl_return_to");
    if (ret && /^#\/(app|o|t)(\/|$)/.test(ret)) return ret;
  } catch {
    /* private mode */
  }
  return null;
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "lg",
  ariaLabel,
}: {
  options: { value: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  size?: "lg" | "sm";
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "grid w-full gap-1 rounded-full bg-muted p-1",
        size === "lg" ? "grid-cols-2" : "grid-cols-2"
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "press flex h-10 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
              size === "lg" && "h-11",
              active ? "bg-forest text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

export function AuthFlow({
  initialRole,
  initialMode,
}: {
  initialRole: RoleToggle;
  initialMode: ModeToggle;
}) {
  const { setUser } = useSession();

  const [role, setRole] = useState<RoleToggle>(initialRole);
  const [mode, setMode] = useState<ModeToggle>(initialMode);
  const [channel, setChannel] = useState<Channel>("SMS");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<Step>("target");

  const [targetError, setTargetError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpNotFound, setOtpNotFound] = useState(false);

  const [requesting, setRequesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [checkingBusiness, setCheckingBusiness] = useState(false);

  const [code, setCode] = useState("");
  const [devMode, setDevMode] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState<number | null>(null);

  const verifyingRef = useRef(false);
  const now = useNow(resendAt !== null);
  const resendSecondsLeft =
    resendAt === null ? 0 : Math.max(0, Math.ceil((resendAt - now) / 1000));

  const target = channel === "EMAIL" ? email.trim() : normalizePhone(phone);

  const validateTarget = (): boolean => {
    setTargetError(null);
    if (channel === "EMAIL") {
      if (!EMAIL_RE.test(target)) {
        setTargetError("Enter a valid email address.");
        return false;
      }
    } else if (!PHONE_RE.test(target)) {
      setTargetError("Enter a valid 10-digit Indian mobile number.");
      return false;
    }
    return true;
  };

  const requestOtp = async ({ isResend = false }: { isResend?: boolean } = {}) => {
    if (!isResend && !validateTarget()) return;
    setRequesting(true);
    setTargetError(null);
    setOtpError(null);
    setOtpNotFound(false);
    try {
      const res = await post<{ delivery: string; devMode?: boolean; devCode?: string }>(
        "/api/auth/otp/request",
        {
          channel,
          target,
          intent: mode === "register" ? "REGISTER" : "LOGIN",
          role: role === "merchant" ? "MERCHANT_OWNER" : "CUSTOMER",
        }
      );
      setDevMode(Boolean(res.devMode));
      setDevCode(res.devCode ?? null);
      setCode("");
      setStep("otp");
      setResendAt(Date.now() + 60_000);
    } catch (e) {
      if (e instanceof ApiError && e.status === 429) {
        setTargetError(e.message);
      } else {
        setTargetError(
          e instanceof ApiError ? e.message : "Couldn't send the code. Please try again."
        );
      }
    } finally {
      setRequesting(false);
    }
  };

  const finishForUser = async (user: SessionUser) => {
    setUser(user);
    if (user.role === "MERCHANT_OWNER" || role === "merchant") {
      // Ensure a business exists; register-merchant users land here first.
      setCheckingBusiness(true);
      try {
        const data = await get<{ business: unknown | null }>("/api/merchant/business");
        if (data.business) {
          navigate("#/merchant");
        } else {
          setStep("business");
          setCheckingBusiness(false);
          return;
        }
      } catch {
        navigate("#/merchant");
      }
      setCheckingBusiness(false);
      return;
    }
    const ret = consumeReturnPath();
    navigate(ret ?? "#/app");
  };

  const verify = async (codeValue: string) => {
    if (verifyingRef.current || codeValue.length !== 6) return;
    verifyingRef.current = true;
    setVerifying(true);
    setOtpError(null);
    setOtpNotFound(false);
    try {
      const res = await post<{ user: SessionUser }>("/api/auth/otp/verify", {
        channel,
        target,
        code: codeValue,
        intent: mode === "register" ? "REGISTER" : "LOGIN",
        role: role === "merchant" ? "MERCHANT_OWNER" : "CUSTOMER",
      });
      await finishForUser(res.user);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setOtpNotFound(true);
        setOtpError(e.message);
      } else {
        setOtpError(e instanceof ApiError ? e.message : "Couldn't verify the code. Try again.");
      }
      setCode("");
    } finally {
      verifyingRef.current = false;
      setVerifying(false);
    }
  };

  // Auto-verify once all six digits are in.
  useEffect(() => {
    if (code.length === 6 && !verifying) void verify(code);
  }, [code]);

  const switchToRegister = () => {
    setMode("register");
    setOtpNotFound(false);
    setOtpError(null);
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-6">
        {/* Role */}
        <Segmented
          ariaLabel="I am a"
          value={role}
          onChange={(v) => {
            setRole(v);
            setOtpError(null);
          }}
          options={[
            { value: "customer", label: "I'm a Customer" },
            { value: "merchant", label: "I'm a Business Owner" },
          ]}
        />

      {step === "business" ? (
        <div className="space-y-4">
          <BusinessRegisterForm
            onSuccess={(user) => {
              setUser(user);
              navigate("#/merchant");
            }}
          />
          <button
            type="button"
            onClick={() => navigate("#/app")}
            className="press mx-auto block text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Skip for now — continue as a customer
          </button>
        </div>
      ) : step === "target" ? (
        <>
          <div>
            <h1 className="font-display text-[1.75rem] font-extrabold tracking-[-0.02em] text-ink">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login"
                ? "Sign in with a one-time code — no passwords here."
                : "We'll send a one-time code to get you started."}
            </p>
          </div>

          <Segmented
            ariaLabel="Sign in or register"
            value={mode}
            onChange={(v) => {
              setMode(v);
              setTargetError(null);
              setOtpError(null);
              setOtpNotFound(false);
            }}
            options={[
              { value: "login", label: "Login" },
              { value: "register", label: "Register" },
            ]}
          />

          <Segmented
            ariaLabel="Sign-in channel"
            size="sm"
            value={channel}
            onChange={(v) => {
              setChannel(v);
              setTargetError(null);
            }}
            options={[
              { value: "SMS", label: "Mobile", icon: <Smartphone className="h-4 w-4" aria-hidden /> },
              { value: "EMAIL", label: "Email", icon: <Mail className="h-4 w-4" aria-hidden /> },
            ]}
          />

          <div className="space-y-1.5">
            <label
              htmlFor="auth-target"
              className="mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground"
            >
              {channel === "EMAIL" ? "Email address" : "Mobile number"}
            </label>
            <Input
              id="auth-target"
              className="h-12 rounded-full px-5 text-base"
              type={channel === "EMAIL" ? "email" : "tel"}
              inputMode={channel === "EMAIL" ? "email" : "numeric"}
              autoComplete={channel === "EMAIL" ? "email" : "tel-national"}
              placeholder={channel === "EMAIL" ? "you@example.com" : "98765 43210"}
              value={channel === "EMAIL" ? email : phone}
              onChange={(e) => {
                setTargetError(null);
                if (channel === "EMAIL") setEmail(e.target.value);
                else setPhone(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !requesting) void requestOtp();
              }}
              aria-invalid={Boolean(targetError)}
            />
            {targetError ? (
              <p className="text-xs font-medium text-destructive" role="alert">
                {targetError}
              </p>
            ) : null}
          </div>

          <Button
            type="button"
            onClick={() => void requestOtp()}
            disabled={requesting}
            className="press h-12 w-full rounded-full text-base font-semibold"
          >
            {requesting ? <Spinner /> : <KeyRound className="h-4 w-4" aria-hidden />}
            Send my code
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                New to Perk Loop?{" "}
                <button
                  type="button"
                  onClick={switchToRegister}
                  className="press font-semibold text-forest underline-offset-4 hover:underline"
                >
                  Register instead
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setOtpError(null);
                  }}
                  className="press font-semibold text-forest underline-offset-4 hover:underline"
                >
                  Login instead
                </button>
              </>
            )}
          </p>
        </>
      ) : (
        <>
          <div>
            <h1 className="font-display text-[1.75rem] font-extrabold tracking-[-0.02em] text-ink">Enter your code</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {channel === "EMAIL" ? (
                <>
                  Sent to <span className="font-semibold text-foreground">{target}</span>
                </>
              ) : (
                <>
                  Sent by SMS to{" "}
                  <span className="font-semibold tabular-nums text-foreground">
                    +91 {target.slice(0, 5)} {target.slice(5)}
                  </span>
                </>
              )}
            </p>
          </div>

          {devMode && devCode && (
            <div
              role="status"
              className="rounded-2xl border border-marigold/50 bg-marigold-soft px-4 py-3"
            >
              <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-sienna">
                <TriangleAlert className="h-4 w-4" aria-hidden />
                Dev mode — provider not configured
              </p>
              <p className="mt-1.5 text-[13px] text-sienna/90">
                No real SMS or email was sent. Your sign-in code:
              </p>
              <p className="mt-1 font-display text-xl font-extrabold tabular-nums tracking-[0.35em] text-sienna">
                {devCode}
              </p>
            </div>
          )}

          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(v) => {
                setOtpError(null);
                setCode(v.replace(/\D/g, ""));
              }}
              disabled={verifying}
              autoFocus
              aria-label="6-digit one-time code"
            >
              <InputOTPGroup className="gap-2">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="h-13 w-11 rounded-xl border-forest/15 bg-card text-lg font-bold text-ink shadow-none first:rounded-xl last:rounded-xl"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          {otpError && (
            <div className="space-y-2">
              <p className="text-center text-sm font-medium text-destructive" role="alert">
                {otpError}
              </p>
              {otpNotFound && (
                <div className="text-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={switchToRegister}
                    className="press h-10 rounded-full"
                  >
                    Switch to Register
                  </Button>
                </div>
              )}
            </div>
          )}

          <Button
            type="button"
            onClick={() => void verify(code)}
            disabled={verifying || code.length !== 6}
            className="press h-12 w-full rounded-full text-base font-semibold"
          >
            {verifying ? <Spinner /> : null}
            {checkingBusiness ? "Checking your account…" : "Verify & continue"}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            {resendSecondsLeft > 0 ? (
              <p className="tabular-nums">Resend available in {resendSecondsLeft}s</p>
            ) : (
              <button
                type="button"
                disabled={requesting}
                onClick={() => void requestOtp({ isResend: true })}
                className="press inline-flex items-center gap-1.5 font-semibold text-forest underline-offset-4 hover:underline disabled:opacity-60"
              >
                {requesting ? <Spinner /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden />}
                Resend code
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setStep("target");
              setCode("");
              setOtpError(null);
              setOtpNotFound(false);
              setDevMode(false);
              setDevCode(null);
            }}
            className="press mx-auto block text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Use a different number or email
          </button>
        </>
      )}
    </div>
  );
}
