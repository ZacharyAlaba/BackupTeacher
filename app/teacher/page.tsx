"use client";

import Timetable from "@/components/Timetable";
import TeacherSidebar from "@/components/TeacherSidebar";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useSession } from "next-auth/react";
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
  teacherId: string;
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
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({ dateOfBirth: "", gender: "", phone: "", address: "" });
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "", otp: "" });
  const [passwordOtpSent, setPasswordOtpSent] = useState(false);
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
    const pageWidth = doc.internal.pageSize.getWidth();

    const teacherName = teacherProfile?.name || session?.user?.name || "Teacher";
    const generatedAt = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

    // Header banner
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, pageWidth, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("Libertad National High School", 10, 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Senior High School - Weekly Teaching Timetable", 10, 17);
    doc.setFontSize(8.5);
    doc.text(`Generated: ${generatedAt}`, pageWidth - 10, 10, { align: "right" });

    // Info bar
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Teacher: ${teacherName}`, 10, 31);
    if (teacherProfile?.phone) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Phone: ${teacherProfile.phone}`, pageWidth - 10, 31, { align: "right" });
    }

    const head = [["Time", ...WEEK_DAYS]];

    const body = timeSlots.map((slot) => {
      const slotKey = `${slot.startTime}-${slot.endTime}`;
      const row = [`${slot.startTime} - ${slot.endTime}`];

      WEEK_DAYS.forEach((day) => {
        const item = schedule.find(
          (scheduleItem) => scheduleItem.day === day && scheduleItem.timeSlot === slotKey
        );

        if (!item) {
          row.push("");
          return;
        }

        row.push(`${item.subject}\n${item.section}${item.room ? `\nRoom ${item.room}` : ""}`);
      });

      return row;
    });

    autoTable(doc, {
      startY: 36,
      head,
      body,
      theme: "grid",
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        valign: "middle",
        halign: "center",
        lineColor: [203, 213, 225],
        lineWidth: 0.2,
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 30, fontStyle: "bold", fillColor: [226, 232, 240] },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index > 0) {
          const text = String(data.cell.raw ?? "").toUpperCase();
          if (text.includes("RECESS") || text.includes("LUNCH")) {
            data.cell.styles.fillColor = [254, 226, 226];
            data.cell.styles.textColor = [153, 27, 27];
            data.cell.styles.fontStyle = "bold";
          } else if (text.trim().length === 0) {
            data.cell.styles.textColor = [148, 163, 184];
          }
        }
      },
      didDrawPage: (data) => {
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setDrawColor(203, 213, 225);
        doc.line(10, pageHeight - 12, pageWidth - 10, pageHeight - 12);
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("Libertad National High School - Senior High School", 10, pageHeight - 7);
        doc.text(`Page ${data.pageNumber}`, pageWidth - 10, pageHeight - 7, { align: "right" });
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
    setProfileEditing(false);
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
          otp: passwordForm.otp,
        }),
      });

      const data = await response.json();

      if (response.status === 202) {
        setPasswordOtpSent(true);
        setPasswordError("A verification code was sent to your email. Enter it to continue.");
      } else if (response.ok) {
        setPasswordSuccess(true);
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "", otp: "" });
        setPasswordOtpSent(false);
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
      <div className="w-full px-4 py-6 md:px-6 xl:px-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[256px_minmax(0,1fr)]">
          <TeacherSidebar
            teacherName={teacherProfile?.name || session?.user?.name || "Teacher"}
            theme={theme}
            onToggleTheme={toggleTheme}
            onEditProfile={openProfileModal}
            onChangePassword={() => setShowPasswordModal(true)}
          />

          <div className="min-w-0">
            <header className="rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl shadow-slate-950/10 light:border-slate-200 light:bg-white light:shadow-slate-200/50">
          <div className="flex flex-col gap-5">
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
          </div>
            </header>

        <section className="mt-4 grid gap-4 lg:grid-cols-3">
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

        <section id="weekly-timetable" className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl shadow-slate-950/10 light:border-slate-200 light:bg-white light:shadow-slate-200/50">
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

        <section className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl shadow-slate-950/10 light:border-slate-200 light:bg-white light:shadow-slate-200/50">
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

        {/* My Profile Modal */}
        {showProfileModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 max-w-lg w-full shadow-lg light:bg-white light:border-slate-200">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300 light:text-indigo-600">Teacher account</p>
                  <h2 className="mt-1 text-2xl font-bold text-white light:text-slate-900">My Profile</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="text-2xl leading-none text-slate-400 hover:text-white light:hover:text-slate-700"
                  aria-label="Close profile"
                >
                  ×
                </button>
              </div>

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

              {!profileEditing ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-slate-600 bg-slate-700/50 p-4 light:border-slate-200 light:bg-slate-100">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 light:text-slate-500">Name</p>
                    <p className="mt-1 text-lg font-semibold text-white light:text-slate-900">{teacherProfile?.name || "Teacher"}</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["Teacher ID", teacherProfile?.teacherId],
                      ["Email", teacherProfile?.email],
                      ["Date of Birth", teacherProfile?.dateOfBirth],
                      ["Gender", teacherProfile?.gender],
                      ["Phone", teacherProfile?.phone],
                      ["Address", teacherProfile?.address],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-slate-600 bg-slate-700/50 p-3 light:border-slate-200 light:bg-white">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 light:text-slate-500">{label}</p>
                        <p className="mt-1 break-words text-sm text-white light:text-slate-900">{value || "Not provided"}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfileEditing(true)}
                    className="mt-3 w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-500"
                  >
                    Edit Profile
                  </button>
                </div>
              ) : (
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 light:text-slate-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={profileForm.dateOfBirth}
                      onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 light:bg-white light:border-slate-300 light:text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 light:text-slate-700 mb-1">Gender</label>
                    <select
                      value={profileForm.gender}
                      onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 light:bg-white light:border-slate-300 light:text-slate-900"
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 light:text-slate-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 light:bg-white light:border-slate-300 light:text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 light:text-slate-700 mb-1">Address</label>
                  <textarea
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500 light:bg-white light:border-slate-300 light:text-slate-900"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg font-semibold hover:bg-slate-700 light:border-slate-300 light:text-slate-700 light:hover:bg-slate-50"
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
              )}
            </div>
          </div>
        )}

        {/* Password Change Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={theme === "dark"
              ? "bg-slate-800 border border-slate-700 rounded-xl p-8 max-w-md w-full shadow-lg"
              : "bg-white border border-slate-200 rounded-xl p-8 max-w-md w-full shadow-lg"}>
              <h2 className={theme === "dark" ? "text-2xl font-bold text-white mb-4" : "text-2xl font-bold text-slate-900 mb-4"}>Change Password</h2>

              {passwordSuccess && (
                <div className={theme === "dark"
                  ? "mb-4 p-3 bg-green-900/30 border border-green-700 text-green-300 rounded-lg"
                  : "mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-lg"}>
                  Password changed successfully!
                </div>
              )}

              {passwordError && (
                <div className={theme === "dark"
                  ? "mb-4 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-lg"
                  : "mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg"}>
                  {passwordError}
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className={theme === "dark" ? "block text-sm font-medium text-slate-300 mb-1" : "block text-sm font-medium text-slate-700 mb-1"}>Current Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className={theme === "dark"
                      ? "w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                      : "w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500"}
                  />
                </div>

                <div>
                  <label className={theme === "dark" ? "block text-sm font-medium text-slate-300 mb-1" : "block text-sm font-medium text-slate-700 mb-1"}>New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className={theme === "dark"
                      ? "w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                      : "w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500"}
                  />
                </div>

                <div>
                  <label className={theme === "dark" ? "block text-sm font-medium text-slate-300 mb-1" : "block text-sm font-medium text-slate-700 mb-1"}>Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className={theme === "dark"
                      ? "w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                      : "w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500"}
                  />
                </div>

                {passwordOtpSent && (
                  <div>
                    <label className={theme === "dark" ? "block text-sm font-medium text-slate-300 mb-1" : "block text-sm font-medium text-slate-700 mb-1"}>Email Verification Code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={passwordForm.otp}
                      onChange={(e) => setPasswordForm({ ...passwordForm, otp: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                      className={theme === "dark"
                        ? "w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                        : "w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-indigo-500"}
                    />
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "", otp: "" });
                      setPasswordOtpSent(false);
                      setPasswordError("");
                    }}
                    className={theme === "dark"
                      ? "flex-1 px-4 py-2 border border-slate-600 text-slate-200 rounded-lg font-semibold hover:bg-slate-700"
                      : "flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50"}
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
      </div>
    </div>
  );
}
