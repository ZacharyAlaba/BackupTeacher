"use client";

import Timetable from "@/components/Timetable";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTeacherTheme } from "@/lib/useTeacherTheme";

type ScheduleItem = {
  day: string;
  timeSlot: string;
  subject: string;
  section: string;
  room?: string | null;
};

type TimeSlot = {
  startTime: string;
  endTime: string;
};

type TeacherProfile = {
  id: string;
  name: string;
  email: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  phone?: string | null;
  address?: string | null;
};

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function isBreakSubject(subject: string) {
  const normalized = subject?.toUpperCase() || "";
  return normalized.includes("RECESS") || normalized.includes("LUNCH");
}

export default function TeacherDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, toggleTheme } = useTeacherTheme();
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [source, setSource] = useState<"database" | "demo" | "loading">("loading");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ dateOfBirth: "", gender: "", phone: "", address: "" });
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const today = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
      }),
    []
  );

  const todayClasses = useMemo(
    () => schedule.filter((item) => item.day === today && !isBreakSubject(item.subject)),
    [schedule, today]
  );

  const realClassCount = useMemo(
    () => schedule.filter((item) => !isBreakSubject(item.subject)).length,
    [schedule]
  );

  const downloadTimetablePdf = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const teacherName = teacherProfile?.name || session?.user?.name || "Teacher";
    const generatedAt = new Date().toLocaleString("en-US");

    doc.setFontSize(16);
    doc.text("Libertad National High School", 14, 14);
    doc.setFontSize(13);
    doc.text("Senior High School - Weekly Teaching Timetable", 14, 22);
    doc.setFontSize(11);
    doc.text(`Teacher: ${teacherName}`, 14, 29);
    if (teacherProfile?.phone) {
      doc.text(`Phone: ${teacherProfile.phone}`, 14, 35);
      doc.text(`Generated: ${generatedAt}`, 14, 41);
    } else {
      doc.text(`Generated: ${generatedAt}`, 14, 35);
    }

    const head = [["Time", ...WEEK_DAYS]];

    const body = timeSlots.map((slot) => {
      const slotKey = `${slot.startTime}-${slot.endTime}`;
      const row = [`${slot.startTime} to ${slot.endTime}`];

      WEEK_DAYS.forEach((day) => {
        const item = schedule.find(
          (scheduleItem) => scheduleItem.day === day && scheduleItem.timeSlot === slotKey
        );

        if (!item) {
          row.push("");
          return;
        }

        row.push(`${item.subject}\n${item.section}${item.room ? `\nRoom: ${item.room}` : ""}`);
      });

      return row;
    });

    autoTable(doc, {
      startY: 40,
      head,
      body,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
        valign: "middle",
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 34, fontStyle: "bold" },
      },
      didDrawPage: () => {
        doc.setFontSize(9);
        doc.text("Libertad National High School - Senior High School", 14, 200);
      },
    });

    const safeName = teacherName.replace(/\s+/g, "-").toLowerCase();
    doc.save(`lnhs-shs-timetable-${safeName}.pdf`);
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let cancelled = false;

    const loadSchedule = async () => {
      try {
        const response = await fetch("/api/teacher/schedule", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          teacher?: TeacherProfile | null;
          schedule: ScheduleItem[];
          timeSlots: TimeSlot[];
          source: "database" | "demo";
        };

        if (!cancelled) {
          setTeacherProfile(data.teacher ?? null);
          setSchedule(data.schedule ?? []);
          setTimeSlots(data.timeSlots ?? []);
          setSource(data.source ?? "demo");
        }
      } catch {
        if (!cancelled) {
          setSource("demo");
        }
      }
    };

    loadSchedule();
    const intervalId = setInterval(loadSchedule, 60000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [status]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
        Loading teacher dashboard...
      </div>
    );
  }

  function openProfileModal() {
    setProfileForm({
      dateOfBirth: teacherProfile?.dateOfBirth || "",
      gender: teacherProfile?.gender || "",
      phone: teacherProfile?.phone || "",
      address: teacherProfile?.address || "",
    });
    setProfileError("");
    setProfileSuccess(false);
    setShowProfileModal(true);
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess(false);

    try {
      const response = await fetch("/api/teacher/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });

      const data = await response.json();

      if (response.ok) {
        setTeacherProfile((current) => (current ? { ...current, ...data } : current));
        setProfileSuccess(true);
        setTimeout(() => {
          setShowProfileModal(false);
          setProfileSuccess(false);
        }, 1500);
      } else {
        setProfileError(data.error || "Failed to update profile");
      }
    } catch (error) {
      setProfileError("Failed to update profile");
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    try {
      const response = await fetch("/api/teacher/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordSuccess(true);
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordSuccess(false);
        }, 2000);
      } else {
        setPasswordError(data.error || "Failed to change password");
      }
    } catch (error) {
      setPasswordError("Failed to change password");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-100 light:bg-none light:from-transparent light:via-transparent light:to-transparent light:bg-slate-100 light:text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
        <header className="rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl shadow-slate-950/10 light:border-slate-200 light:bg-white light:shadow-slate-200/50">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 light:text-slate-500">
                Libertad NHS Senior High
              </p>
              <h1 className="mt-1 text-3xl font-semibold text-white light:text-slate-900">Teacher Dashboard</h1>
              <p className="mt-1 text-slate-300 light:text-slate-600">Welcome, {teacherProfile?.name || session?.user?.name || "Teacher"}</p>
              <p className="mt-1 text-xs text-slate-500 light:text-slate-400">
                Data source: {source === "loading" ? "loading..." : source}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push("/teacher/attendance")}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
              >
                Attendance
              </button>
              <button
                onClick={openProfileModal}
                className="rounded-xl bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm font-semibold text-white transition light:bg-slate-200 light:text-slate-900 light:hover:bg-slate-300"
              >
                Edit Profile
              </button>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="rounded-xl bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm font-semibold text-white transition light:bg-slate-200 light:text-slate-900 light:hover:bg-slate-300"
              >
                Change Password
              </button>
              <button
                onClick={toggleTheme}
                className="rounded-xl bg-slate-700 hover:bg-slate-600 px-4 py-2 text-sm font-semibold text-white transition light:bg-slate-200 light:text-slate-900 light:hover:bg-slate-300"
              >
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {teacherProfile && (
          <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl shadow-slate-950/10 light:border-slate-200 light:bg-white light:shadow-slate-200/50">
            <h2 className="text-xl font-semibold text-white light:text-slate-900">Your Profile</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 light:border-slate-200 light:bg-slate-50">
                <p className="text-sm text-slate-400 light:text-slate-500">Email</p>
                <p className="mt-1 text-white light:text-slate-900">{teacherProfile.email}</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 light:border-slate-200 light:bg-slate-50">
                <p className="text-sm text-slate-400 light:text-slate-500">Date of Birth</p>
                <p className="mt-1 text-white light:text-slate-900">{teacherProfile.dateOfBirth || "—"}</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 light:border-slate-200 light:bg-slate-50">
                <p className="text-sm text-slate-400 light:text-slate-500">Gender</p>
                <p className="mt-1 text-white light:text-slate-900">{teacherProfile.gender || "—"}</p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 light:border-slate-200 light:bg-slate-50">
                <p className="text-sm text-slate-400 light:text-slate-500">Phone</p>
                <p className="mt-1 text-white light:text-slate-900">{teacherProfile.phone || "—"}</p>
              </div>
              <div className="lg:col-span-2 rounded-2xl border border-slate-700 bg-slate-800 p-4 light:border-slate-200 light:bg-slate-50">
                <p className="text-sm text-slate-400 light:text-slate-500">Address</p>
                <p className="mt-1 text-white light:text-slate-900">{teacherProfile.address || "—"}</p>
              </div>
            </div>
          </section>
        )}

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-xl shadow-slate-950/10 light:border-slate-200 light:bg-white light:shadow-slate-200/50">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 light:text-slate-500">Today</p>
            <h2 className="mt-2 text-lg font-semibold text-white light:text-slate-900">{today} Classes</h2>
            <p className="mt-2 text-3xl font-semibold text-indigo-300 light:text-indigo-600">{todayClasses.length}</p>
          </article>

          <article className="rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-xl shadow-slate-950/10 light:border-slate-200 light:bg-white light:shadow-slate-200/50">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 light:text-slate-500">This Week</p>
            <h2 className="mt-2 text-lg font-semibold text-white light:text-slate-900">Total Class Blocks</h2>
            <p className="mt-2 text-3xl font-semibold text-indigo-300 light:text-indigo-600">{realClassCount}</p>
          </article>

          <article className="rounded-2xl border border-slate-700 bg-slate-800 p-5 shadow-xl shadow-slate-950/10 light:border-slate-200 light:bg-white light:shadow-slate-200/50">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 light:text-slate-500">Quick Guide</p>
            <h2 className="mt-2 text-lg font-semibold text-white light:text-slate-900">How to use</h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-300 light:text-slate-600">
              <li>• Check today’s classes first.</li>
              <li>• Review your weekly timetable below.</li>
              <li>• Report conflicts to admin immediately.</li>
            </ul>
          </article>
        </section>

        <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl shadow-slate-950/10 light:border-slate-200 light:bg-white light:shadow-slate-200/50">
          <h2 className="text-xl font-semibold text-white light:text-slate-900">Today&apos;s Class Details</h2>
          {todayClasses.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400 light:text-slate-500">No classes scheduled for today.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700 text-sm light:divide-slate-200">
                <thead className="bg-slate-800 light:bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300 light:text-slate-600">Time</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300 light:text-slate-600">Subject</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300 light:text-slate-600">Section</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-300 light:text-slate-600">Room</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 bg-slate-950 light:divide-slate-200 light:bg-white">
                  {todayClasses.map((item) => (
                    <tr key={`${item.day}-${item.timeSlot}-${item.subject}`} className="odd:bg-slate-900 even:bg-slate-950 light:odd:bg-white light:even:bg-slate-50">
                      <td className="px-4 py-3 text-slate-300 light:text-slate-600">{item.timeSlot}</td>
                      <td className="px-4 py-3 text-white font-medium light:text-slate-900">{item.subject}</td>
                      <td className="px-4 py-3 text-slate-300 light:text-slate-600">{item.section}</td>
                      <td className="px-4 py-3 text-slate-300 light:text-slate-600">{item.room || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-xl shadow-slate-950/10 light:border-slate-200 light:bg-white light:shadow-slate-200/50">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold text-white light:text-slate-900">Weekly Timetable</h2>
            <button
              onClick={downloadTimetablePdf}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Download PDF
            </button>
          </div>
          <Timetable schedule={schedule} timeSlots={timeSlots} />
        </section>

        {/* Edit Profile Modal */}
        {showProfileModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-lg w-full shadow-lg">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Edit Profile</h2>

              {profileSuccess && (
                <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-lg">
                  Profile updated successfully!
                </div>
              )}

              {profileError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
                  {profileError}
                </div>
              )}

              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={profileForm.dateOfBirth}
                      onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                    <select
                      value={profileForm.gender}
                      onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <textarea
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg font-semibold"
                  >
                    Save Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md w-full shadow-lg">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Change Password</h2>

              {passwordSuccess && (
                <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-lg">
                  Password changed successfully!
                </div>
              )}

              {passwordError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
                  {passwordError}
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                      setPasswordError("");
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg font-semibold"
                  >
                    Change Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
