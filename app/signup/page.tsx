"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password, confirmPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data?.message || "Signup failed.");
        setLoading(false);
        return;
      }

      // Auto sign in after signup
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/login");
        return;
      }

      router.push("/teacher");
      router.refresh();
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(14,165,233,0.3),transparent_35%),radial-gradient(circle_at_82%_12%,rgba(16,185,129,0.28),transparent_38%),radial-gradient(circle_at_50%_100%,rgba(99,102,241,0.2),transparent_40%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.55),rgba(2,6,23,0.9))]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:34px_34px]" />

      <div className="absolute -top-28 right-0 h-[420px] w-[420px] rounded-full bg-emerald-400/30 blur-3xl float-slow" />
      <div className="absolute -bottom-24 -left-10 h-[360px] w-[360px] rounded-full bg-cyan-400/30 blur-3xl float-slow" />

      <div className="relative flex min-h-screen items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="rounded-[1.8rem] border border-white/15 bg-white/10 p-7 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
            <div>
              <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                Libertad NHS Senior High
              </p>
              <h2 className="mt-4 text-3xl font-semibold text-white">
                Create a teacher account
              </h2>
              <p className="mt-3 text-sm text-slate-300">
                Create your Senior High School teacher account to access your schedule dashboard.
              </p>
            </div>

            <form onSubmit={handleSignup} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="firstName">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="block w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-slate-100 placeholder-slate-400 outline-none ring-0 transition focus:border-white/40"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="lastName">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="block w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-slate-100 placeholder-slate-400 outline-none ring-0 transition focus:border-white/40"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-slate-100 placeholder-slate-400 outline-none ring-0 transition focus:border-white/40"
                  placeholder="teacher@school.edu"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-slate-100 placeholder-slate-400 outline-none ring-0 transition focus:border-white/40"
                  placeholder="Create a password"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="confirmPassword">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="block w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-slate-100 placeholder-slate-400 outline-none ring-0 transition focus:border-white/40"
                  placeholder="Repeat your password"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-300/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-3 font-semibold text-white shadow-lg transition hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>

            <div className="mt-5 text-sm text-slate-300">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-white underline decoration-white/30 underline-offset-4">
                Log in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
