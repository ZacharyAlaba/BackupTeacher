"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

type OTPFormProps = {
  email: string;
  password: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  onBack: () => void;
};

export default function OTPForm({ email, password, role, onBack }: OTPFormProps) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const isAdmin = role === "ADMIN";
  const isTeacher = role === "TEACHER";

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Verify OTP
      const verifyRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        setError(data.error || "Failed to verify OTP");
        setLoading(false);
        return;
      }

      // Now sign in with credentials
      const { signIn } = await import("next-auth/react");
      const result = await signIn("credentials", {
        identifier: email,
        password,
        role,
        redirect: false,
      });

      if (result?.error) {
        setError("Login failed. Please try again.");
        setLoading(false);
        return;
      }

      // Redirect based on role
      if (isAdmin) {
        router.push("/admin");
      } else if (isTeacher) {
        router.push("/teacher");
      } else {
        router.push("/student");
      }
      router.refresh();
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError("");
    setResendLoading(true);

    try {
      const sendRes = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!sendRes.ok) {
        const data = await sendRes.json();
        setError(data.error || "Failed to resend OTP");
        setResendLoading(false);
        return;
      }

      setOtp("");
      setError("");
      alert("OTP has been resent to your email");
      setResendLoading(false);
    } catch (err) {
      setError("Failed to resend OTP. Please try again.");
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen w-full items-center px-4 py-10 md:px-8">
        <div className="grid w-full overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-2">
          {/* Left Panel with Background Image */}
          <section 
            className="relative hidden flex-col justify-between p-8 text-white md:flex md:p-10 lg:p-12"
            style={{
              backgroundImage: "url('/images/libertad.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/50"></div>
            
            <div className="relative z-10">
              <div className="inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-white/10 backdrop-blur">
                <Image
                  src="/images/logo.jpg"
                  alt="Libertad National High School"
                  width={80}
                  height={80}
                  className="object-cover"
                />
              </div>
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-white/90">
                Libertad National High School
              </p>
              <h1 className="mt-3 text-4xl font-bold leading-tight">
                Senior High School<br />Scheduling Portal
              </h1>
              <p className="mt-5 max-w-md text-white/90 leading-relaxed">
                Secure login with one-time password verification for enhanced account protection.
              </p>
            </div>
            <p className="relative z-10 text-sm text-white/80">School year schedule management system</p>
          </section>

          {/* Right Panel with OTP Form */}
          <section className="p-8 md:p-10 lg:p-12">
            <div className="mb-8 lg:hidden">
              <div className="inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-slate-100">
                <Image
                  src="/images/logo.jpg"
                  alt="Libertad National High School"
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                Two-Factor Authentication
              </p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                Verify Your Identity
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Enter the 6-digit code sent to<br />
                <strong>{email}</strong>
              </p>
            </div>

            <form onSubmit={handleVerifyOTP} className="mt-8 space-y-4">
              <div>
                <label htmlFor="otp" className="mb-2 block text-sm font-medium text-slate-700">
                  Verification Code
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-2xl font-semibold text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 tracking-widest"
                  placeholder="000000"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify Code"}
              </button>
            </form>

            <div className="mt-6 space-y-3 text-sm text-slate-600">
              <button
                onClick={handleResendOTP}
                disabled={resendLoading}
                className="w-full font-semibold text-indigo-700 hover:text-indigo-600 disabled:opacity-60"
              >
                {resendLoading ? "Resending..." : "Didn't receive the code? Resend"}
              </button>
              <button
                onClick={onBack}
                className="block w-full font-semibold text-indigo-700 hover:text-indigo-600"
              >
                ← Back to login
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
