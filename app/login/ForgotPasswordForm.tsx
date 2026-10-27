"use client";

import { useEffect, useState } from "react";

type ForgotPasswordFormProps = {
  initialEmail: string;
  onBack: () => void;
};

export default function ForgotPasswordForm({ initialEmail, onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendAt, setResendAt] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    const updateCountdown = () => {
      setResendSeconds(
        Math.max(0, Math.ceil((new Date(resendAt).getTime() - Date.now()) / 1000))
      );
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(intervalId);
  }, [resendAt]);

  const requestCode = async () => {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.retryAfterSeconds) {
          setResendAt(new Date(Date.now() + data.retryAfterSeconds * 1000).toISOString());
        }
        setError(data.error || "Could not request a reset code.");
        return;
      }

      setCodeSent(true);
      setResendAt(new Date(Date.now() + 30_000).toISOString());
      setMessage(data.message);
    } catch {
      setError("Could not request a reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not reset the password.");
        return;
      }

      setMessage("Password reset successfully. You can now sign in with your new password.");
      setCodeSent(false);
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Could not reset the password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
          Account recovery
        </p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Forgot password?</h2>
        <p className="mt-2 text-sm text-slate-600">
          We&apos;ll email a one-time code to the address on your student or teacher account.
        </p>
      </div>

      {message && (
        <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!codeSent ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="reset-email" className="mb-2 block text-sm font-medium text-slate-700">
              Email address
            </label>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              placeholder="name@example.com"
            />
          </div>
          <button
            type="button"
            onClick={() => void requestCode()}
            disabled={loading || !email || resendSeconds > 0}
            className="w-full rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-60"
          >
            {loading
              ? "Sending code..."
              : resendSeconds > 0
                ? `Try again in ${resendSeconds}s`
                : "Send reset code"}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-otp" className="mb-2 block text-sm font-medium text-slate-700">
              6-digit email code
            </label>
            <input
              id="reset-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              required
              className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-center text-2xl font-semibold tracking-widest text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              placeholder="000000"
            />
          </div>
          <div>
            <label htmlFor="new-password" className="mb-2 block text-sm font-medium text-slate-700">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              required
              className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-slate-700">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
              className="block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full rounded-xl bg-indigo-700 px-4 py-3 font-semibold text-white transition hover:bg-indigo-600 disabled:opacity-60"
          >
            {loading ? "Resetting password..." : "Reset password"}
          </button>
          <button
            type="button"
            onClick={() => void requestCode()}
            disabled={loading || resendSeconds > 0}
            className="w-full rounded-xl border border-indigo-200 px-4 py-3 font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : "Resend code"}
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={onBack}
        className="block w-full text-sm font-semibold text-indigo-700 hover:text-indigo-600"
      >
        ← Back to sign in
      </button>
    </div>
  );
}
