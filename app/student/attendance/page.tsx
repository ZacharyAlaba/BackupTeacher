"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTeacherTheme } from "@/lib/useTeacherTheme";
import StudentSidebar from "@/components/StudentSidebar";

type AttendanceRecord = {
  id: string;
  gradingPeriod: string;
  academicYear: string;
  status: string;
  remarks?: string | null;
  subject: { id: string; name: string };
  teacher: { user: { name: string; email: string } };
  section: { name: string };
};

type StudentAttendanceResponse = {
  studentId: string;
  name: string;
  email: string;
  gradeLevel: string;
  section: { name: string; gradeLevel: string; track: string };
  attendance: AttendanceRecord[];
};

type StudentProfile = {
  id: string;
  name: string;
  email: string;
  studentId: string;
  gradeLevel: string;
  sectionName: string;
  track: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  phone?: string | null;
  address?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
};

type SubjectAttendanceSummary = {
  subjectName: string;
  teacherNames: string[];
  counts: Record<string, number>;
  total: number;
};

const statusLabels: Record<string, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  LEFT_EARLY: "Left early",
  EXCUSED: "Excused",
};

const statusOrder = ["PRESENT", "ABSENT", "LATE", "LEFT_EARLY", "EXCUSED"];

export default function StudentAttendancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, toggleTheme } = useTeacherTheme();
  const [data, setData] = useState<StudentAttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attendancePage, setAttendancePage] = useState(0);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileForm, setProfileForm] = useState({
    dateOfBirth: "",
    gender: "",
    phone: "",
    address: "",
    guardianName: "",
    guardianPhone: "",
  });
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "", otp: "" });
  const [passwordOtpSent, setPasswordOtpSent] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  function openProfileModal() {
    setProfileForm({
      dateOfBirth: studentProfile?.dateOfBirth || "",
      gender: studentProfile?.gender || "",
      phone: studentProfile?.phone || "",
      address: studentProfile?.address || "",
      guardianName: studentProfile?.guardianName || "",
      guardianPhone: studentProfile?.guardianPhone || "",
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
      const response = await fetch("/api/student/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });

      const data = await response.json();

      if (response.ok) {
        setStudentProfile((current) => (current ? { ...current, ...data } : current));
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
      const response = await fetch("/api/student/change-password", {
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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login/student");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let cancelled = false;

    async function loadStudentProfile() {
      try {
        const response = await fetch("/api/student/profile", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        if (!cancelled) {
          setStudentProfile({
            id: payload.id || "",
            name: payload.name || data?.name || "Student",
            email: payload.email || data?.email || "",
            studentId: payload.studentId || data?.studentId || "",
            gradeLevel: payload.gradeLevel || data?.gradeLevel || "",
            sectionName: payload.sectionName || data?.section?.name || "",
            track: payload.track || data?.section?.track || "",
            dateOfBirth: payload.dateOfBirth || null,
            gender: payload.gender || null,
            phone: payload.phone || null,
            address: payload.address || null,
            guardianName: payload.guardianName || null,
            guardianPhone: payload.guardianPhone || null,
          });
        }
      } catch (error) {
        console.error("Failed to load student profile:", error);
      }
    }

    loadStudentProfile();

    return () => {
      cancelled = true;
    };
  }, [status, data?.name, data?.email, data?.studentId, data?.gradeLevel, data?.section?.name, data?.section?.track]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let cancelled = false;

    async function loadAttendance() {
      try {
        const response = await fetch("/api/student/attendance", { cache: "no-store" });
        if (!response.ok) {
          const body = await response.text();
          const message = `Failed to load attendance (${response.status}): ${body || response.statusText}`;
          console.error(message);
          if (!cancelled) setError(message);
          return;
        }
        const payload = (await response.json()) as StudentAttendanceResponse;
        if (!cancelled) setData(payload);
      } catch (error) {
        console.error("Failed to load student attendance:", error);
        if (!cancelled) setError("Failed to load attendance. Check your login and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAttendance();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const attendanceDates = useMemo(() => {
    if (!data) return [] as string[];
    return Array.from(new Set(data.attendance.map((record) => record.date).filter(Boolean))).sort();
  }, [data]);

  const visibleAttendanceDates = useMemo(
    () => attendanceDates.slice(attendancePage * 5, attendancePage * 5 + 5),
    [attendanceDates, attendancePage]
  );

  const totalAttendancePages = Math.max(1, Math.ceil(attendanceDates.length / 5));

  useEffect(() => {
    setAttendancePage(0);
  }, [data?.studentId]);

  const subjectRows = useMemo(() => {
    const groups = new Map<
      string,
      {
        subjectName: string;
        statusByDate: Map<string, string>;
        counts: Record<string, number>;
      }
    >();

    data?.attendance.forEach((record) => {
      const subjectName = record.subject?.name || "Unassigned";
      const existing = groups.get(subjectName) || {
        subjectName,
        statusByDate: new Map<string, string>(),
        counts: {
          PRESENT: 0,
          ABSENT: 0,
          LATE: 0,
          LEFT_EARLY: 0,
          EXCUSED: 0,
        },
      };

      if (record.date) {
        existing.statusByDate.set(record.date, record.status);
      }

      const statusKey = record.status || "ABSENT";
      existing.counts[statusKey] = (existing.counts[statusKey] || 0) + 1;
      groups.set(subjectName, existing);
    });

    return Array.from(groups.values()).sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }, [data]);

  const statusSymbols: Record<string, string> = {
    PRESENT: "✓",
    ABSENT: "-",
    LATE: "△",
    LEFT_EARLY: "◇",
    EXCUSED: "○",
  };

  const statusClasses: Record<string, string> = {
    PRESENT: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 light:border-emerald-600 light:bg-emerald-50 light:text-emerald-700",
    ABSENT: "border-rose-500/30 bg-rose-500/10 text-rose-300 light:border-rose-600 light:bg-rose-50 light:text-rose-700",
    LATE: "border-amber-500/30 bg-amber-500/10 text-amber-300 light:border-amber-600 light:bg-amber-50 light:text-amber-700",
    LEFT_EARLY: "border-orange-500/30 bg-orange-500/10 text-orange-300 light:border-orange-600 light:bg-orange-50 light:text-orange-700",
    EXCUSED: "border-sky-500/30 bg-sky-500/10 text-sky-300 light:border-sky-600 light:bg-sky-50 light:text-sky-700",
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading attendance...</div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center text-white">
        <div className="rounded-3xl border border-slate-700 bg-slate-900/70 p-8 text-center text-slate-400 max-w-xl">
          <p className="mb-4 text-lg font-semibold text-white">Attendance unavailable</p>
          <p>{error ?? "No attendance records available."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white light:from-slate-100 light:via-slate-100 light:to-slate-200 light:text-slate-900">
      <div className="w-full px-4 py-6 md:px-6 xl:px-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[256px_minmax(0,1fr)]">
          <StudentSidebar
            studentName={data.name}
            studentId={data.studentId}
            theme={theme}
            onToggleTheme={toggleTheme}
            onEditProfile={openProfileModal}
            onChangePassword={() => setShowPasswordModal(true)}
          />

          <div className="min-w-0">
            <div className="mb-5 rounded-2xl border border-slate-700 bg-slate-900/70 p-5 shadow-xl backdrop-blur light:border-slate-200 light:bg-white">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-300 light:text-emerald-700">Subject Attendance</p>
                <h1 className="mt-2 text-3xl font-semibold text-white light:text-slate-900">{data.name}</h1>
                <p className="mt-2 text-sm text-slate-400 light:text-slate-500">{data.studentId} · {data.section.name} · {data.gradeLevel}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-700 bg-slate-900/70 shadow-2xl light:border-slate-200 light:bg-white">
              <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900/60 px-4 py-3 light:border-slate-200 light:bg-slate-100">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-300 light:text-slate-600">
                  <span className="text-slate-400 light:text-slate-500">Status:</span>
                  {statusOrder.map((status) => (
                    <span key={status} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-medium ${statusClasses[status]}`}>
                      <span className="text-sm font-bold normal-case leading-none">{statusSymbols[status]}</span>
                      {statusLabels[status].toUpperCase()}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAttendancePage((page) => Math.max(0, page - 1))}
                    disabled={attendancePage === 0}
                    className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 light:border-slate-300 light:text-slate-600 light:hover:bg-slate-100"
                    aria-label="Previous attendance dates"
                  >
                    ←
                  </button>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400 light:text-slate-500">
                    {data.section.name} · {data.gradeLevel}
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttendancePage((page) => Math.min(totalAttendancePages - 1, page + 1))}
                    disabled={attendancePage >= totalAttendancePages - 1}
                    className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 light:border-slate-300 light:text-slate-600 light:hover:bg-slate-100"
                    aria-label="Next attendance dates"
                  >
                    →
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-separate border-spacing-0">
                  <thead>
                    <tr className="bg-slate-900/60 text-left text-[10px] uppercase tracking-[0.16em] text-slate-400 light:bg-slate-100 light:text-slate-500">
                      <th className="border-b border-slate-700 px-4 py-3 font-semibold light:border-slate-200">Subject</th>
                      {visibleAttendanceDates.map((date) => (
                        <th key={date} className="border-b border-slate-700 px-2 py-3 text-center font-semibold light:border-slate-200">
                          {new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {subjectRows.length === 0 ? (
                      <tr>
                        <td colSpan={visibleAttendanceDates.length + 1} className="border-b border-slate-800 px-4 py-6 text-center text-slate-400 light:border-slate-200 light:text-slate-500">
                          No attendance has been posted yet.
                        </td>
                      </tr>
                    ) : (
                      subjectRows.map(({ subjectName, statusByDate }) => (
                        <tr key={subjectName} className="bg-slate-900/30 hover:bg-slate-800/40 light:bg-white light:hover:bg-slate-50">
                          <td className="border-b border-slate-800 bg-slate-900/40 px-4 py-3 align-middle light:border-slate-200 light:bg-white">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white">
                                {subjectName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium text-white light:text-slate-900">{subjectName}</div>
                                <div className="text-[11px] text-slate-400 light:text-slate-500">Attendance</div>
                              </div>
                            </div>
                          </td>

                          {visibleAttendanceDates.map((date) => {
                            const status = statusByDate.get(date) || "";
                            const statusClass = statusClasses[status] || "border-slate-700 bg-slate-800/40 text-slate-300 light:border-slate-200 light:bg-slate-100 light:text-slate-400";
                            return (
                              <td key={`${subjectName}-${date}`} className="border-b border-slate-800 px-2 py-3 text-center align-middle light:border-slate-200">
                                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-semibold ${statusClass}`}>
                                  {status ? statusSymbols[status] || "-" : "-"}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 max-w-lg w-full shadow-lg">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">Student account</p>
                <h2 className="mt-1 text-2xl font-bold text-white">My Profile</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="text-2xl leading-none text-slate-400 hover:text-white"
                aria-label="Close profile"
              >
                ×
              </button>
            </div>

            {profileSuccess && (
              <div className="mb-4 p-3 bg-green-900/30 border border-green-700 text-green-300 rounded-lg">
                Profile updated successfully!
              </div>
            )}

            {profileError && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-lg">
                {profileError}
              </div>
            )}

            {!profileEditing ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-600 bg-slate-700/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Name</p>
                  <p className="mt-1 text-lg font-semibold text-white">{studentProfile?.name || data.name}</p>
                  <p className="mt-1 text-sm text-slate-300">Student ID: {studentProfile?.studentId || data.studentId}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["Email", studentProfile?.email || data.email],
                    ["Section", studentProfile?.sectionName || data.section.name],
                    ["Grade Level", studentProfile?.gradeLevel || data.gradeLevel],
                    ["Track", studentProfile?.track || data.section.track],
                    ["Date of Birth", studentProfile?.dateOfBirth],
                    ["Gender", studentProfile?.gender],
                    ["Phone", studentProfile?.phone],
                    ["Guardian", studentProfile?.guardianName],
                    ["Guardian Phone", studentProfile?.guardianPhone],
                    ["Address", studentProfile?.address],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-lg border border-slate-600 bg-slate-700/40 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{String(label)}</p>
                      <p className="mt-1 break-words text-sm text-white">{value || "Not provided"}</p>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setProfileEditing(true)}
                  className="mt-3 w-full rounded-lg bg-cyan-600 px-4 py-2.5 font-semibold text-white hover:bg-cyan-500"
                >
                  Edit Profile
                </button>
              </div>
            ) : (
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={profileForm.dateOfBirth}
                      onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Gender</label>
                    <select
                      value={profileForm.gender}
                      onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Guardian Name</label>
                    <input
                      type="text"
                      value={profileForm.guardianName}
                      onChange={(e) => setProfileForm({ ...profileForm, guardianName: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Guardian Phone</label>
                    <input
                      type="tel"
                      value={profileForm.guardianPhone}
                      onChange={(e) => setProfileForm({ ...profileForm, guardianPhone: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Address</label>
                  <textarea
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="flex-1 px-4 py-2 border border-slate-600 text-slate-200 rounded-lg font-semibold hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold"
                  >
                    Save Profile
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

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
                    ? "w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    : "w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-cyan-500"}
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
                    ? "w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    : "w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-cyan-500"}
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
                    ? "w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    : "w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-cyan-500"}
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
                      ? "w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                      : "w-full px-4 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-cyan-500"}
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
                  className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold"
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
