"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import OTPForm from "./OTPForm";

type UserRole = "ADMIN" | "TEACHER" | "STUDENT";

type LoginFormProps = {
  role: UserRole;
};

export default function LoginForm({ role }: LoginFormProps) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOTPForm, setShowOTPForm] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");

  const isAdmin = role === "ADMIN";
  const isTeacher = role === "TEACHER";
  const isStudent = role === "STUDENT";

  const getErrorMessage = () => {
    if (isAdmin) return "Invalid admin account or password";
    if (isTeacher) return "Invalid teacher account or password";
    return "Invalid student ID or password";
  };

  const getPlaceholder = () => {
    if (isAdmin) return "admin@school.edu";
    if (isTeacher) return "teacher@school.edu";
    return "Student ID (e.g., STU001)";
  };

  const getLabel = () => {
    if (isAdmin) return "Email address";
    if (isTeacher) return "Email address";
    return "Student ID";
  };

  const getRoleDescription = () => {
    if (isAdmin)
      return "Administrator access for managing sections, schedules, and teacher assignments.";
    if (isTeacher)
      return "Teacher access for viewing your class programs and weekly timetable.";
    return "Student access for viewing your class schedule and enrolled sections.";
  };

  const getButtonText = () => {
    if (isAdmin) return "Continue as Admin";
    if (isTeacher) return "Continue as Teacher";
    return "Continue as Student";
  };

  const getTitle = () => {
    if (isAdmin) return "Sign in as Administrator";
    if (isTeacher) return "Sign in as Teacher";
    return "Sign in as Student";
  };

  const getLoginType = () => {
    if (isAdmin) return "Admin Login";
    if (isTeacher) return "Teacher Login";
    return "Student Login";
  };

  const getRoleColor = () => {
    if (isAdmin) return "indigo";
    if (isTeacher) return "cyan";
    return "green";
  };

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
        setError(data.error || getErrorMessage());
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (!data.requiresOtp) {
        const { signIn } = await import("next-auth/react");
        const result = await signIn("credentials", {
          identifier,
          password,
          role,
          redirect: false,
        });

        if (result?.error) {
          setError(getErrorMessage());
        } else {
          router.push(isAdmin ? "/admin" : isTeacher ? "/teacher" : "/student");
          router.refresh();
        }
      } else {
        setOtpEmail(data.email || identifier);
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

  const themeClass = `${getRoleColor()}`;

  // Show OTP form if OTP verification is needed
  if (showOTPForm) {
    return (
      <OTPForm
        email={otpEmail}
        password={password}
        role={role}
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
                {getRoleDescription()}
              </p>
            </div>
            <p className="relative z-10 text-sm text-white/80">School year schedule management system</p>
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
                {getLoginType()}
              </p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                {getTitle()}
              </h2>
              <p className="mt-2 text-sm text-slate-600">Enter your account credentials to continue.</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label htmlFor="identifier" className="mb-2 block text-sm font-medium text-slate-700">
                  {getLabel()}
                </label>
                <input
                  id="identifier"
                  type={isStudent ? "text" : "email"}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder={getPlaceholder()}
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
                {loading ? "Signing in..." : getButtonText()}
              </button>
            </form>

            <div className="mt-6 flex flex-col gap-3 text-sm text-slate-600">
              <Link href="/login" className="font-semibold text-indigo-700 hover:text-indigo-600">
                ← Back to role selection
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}