"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import OTPForm from "./OTPForm";

type UserRole = "ADMIN" | "TEACHER" | "STUDENT";

export default function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOTPForm, setShowOTPForm] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [roleForLogin, setRoleForLogin] = useState<UserRole | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // First, verify credentials by attempting to get user from database
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: identifier, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Invalid email or password");
        setLoading(false);
        return;
      }

      const data = await res.json();
      const authenticatedRole = data.role as UserRole;

      if (!["ADMIN", "TEACHER", "STUDENT"].includes(authenticatedRole)) {
        setError("This account does not have a valid portal role.");
        setLoading(false);
        return;
      }

      if (!data.requiresOtp) {
        const { signIn } = await import("next-auth/react");
        const result = await signIn("credentials", {
          identifier,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError("Invalid email or password");
        } else {
          router.push(authenticatedRole === "ADMIN" ? "/admin" : authenticatedRole === "TEACHER" ? "/teacher" : "/student");
          router.refresh();
        }
      } else {
        setOtpEmail(data.email || identifier);
        setRoleForLogin(authenticatedRole);
        setShowOTPForm(true);
      }
      setLoading(false);
    } catch {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleBackFromOTP = () => {
    setShowOTPForm(false);
    setOtpEmail("");
    setError("");
  };

  // Show OTP form if OTP verification is needed
  if (showOTPForm) {
    if (!roleForLogin) return null;

    return (
      <OTPForm
        email={otpEmail}
        password={password}
        role={roleForLogin}
        onBack={handleBackFromOTP}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen w-full items-stretch px-0">
        <div className="grid min-h-screen w-full overflow-hidden bg-white shadow-2xl lg:grid-cols-2">
          {/* Left Panel with Background Image */}
          <section 
            className="relative hidden flex-col justify-between p-8 text-white md:flex md:p-10 lg:p-12"
          >
            <Image
              src="/images/libertad.jpg"
              alt="Libertad National High School"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              quality={75}
              className="object-cover object-center"
            />
            {/* Dark overlay */}
            <div className="absolute inset-0 z-10 bg-black/50"></div>
            
            <div className="relative z-20">
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
                One place for Senior High School class scheduling, teacher assignment, and timetable access.
              </p>
            </div>
            <p className="relative z-20 text-sm text-white/80">School year schedule management system</p>
          </section>

          {/* Right Panel with Login Form */}
          <section className="flex flex-col justify-center p-8 md:p-12 lg:px-16 lg:py-16">
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
                School Scheduling Portal
              </p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                Welcome
              </h2>
              <p className="mt-2 text-sm text-slate-600">Enter your account credentials to continue.</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label htmlFor="identifier" className="mb-2 block text-sm font-medium text-slate-700">
                  Email address
                </label>
                <input
                  id="identifier"
                  type="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="name@school.edu"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Enter your password"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

          </section>
        </div>
      </div>
    </div>
  );
}