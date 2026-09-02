"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Timetable from "@/components/Timetable";
import StudentSidebar from "@/components/StudentSidebar";
import { useTeacherTheme } from "@/lib/useTeacherTheme";

interface Subject {
  id: string;
  name: string;
  gradeLevel: string;
  track?: string;
}

interface TimeSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
}

interface Teacher {
  id: string;
  user: {
    name: string;
    email: string;
  };
}

interface ScheduleBlock {
  id: string;
  subject: Subject;
  timeSlot: TimeSlot;
  room?: string;
  teacher: Teacher;
}

interface Section {
  id: string;
  name: string;
  gradeLevel: string;
  track: string;
}

interface StudentData {
  studentId: string;
  name: string;
  email: string;
  gradeLevel: string;
  section: Section;
  dateOfBirth?: string | null;
  gender?: string | null;
  phone?: string | null;
  address?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  schedule: ScheduleBlock[];
}

export default function StudentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, toggleTheme } = useTeacherTheme();
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.role === "STUDENT") {
      fetchStudentData();
    }
  }, [session]);

  async function fetchStudentData() {
    try {
      const response = await fetch("/api/teacher/schedule");
      if (response.ok) {
        const data = await response.json();
        setStudentData(data);
        setTimeSlots(data.timeSlots ?? []);
      }
    } catch (error) {
      console.error("Failed to fetch student data:", error);
    } finally {
      setLoading(false);
    }
  }

  function openProfileModal() {
    setProfileForm({
      dateOfBirth: studentData?.dateOfBirth || "",
      gender: studentData?.gender || "",
      phone: studentData?.phone || "",
      address: studentData?.address || "",
      guardianName: studentData?.guardianName || "",
      guardianPhone: studentData?.guardianPhone || "",
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
        setStudentData((current) => (current ? { ...current, ...data } : current));
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

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  function formatDisplayTime(value: string) {
    if (!value) return "";
    const normalized = value.trim();
    if (/AM|PM/i.test(normalized)) {
      const m = normalized.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
      if (!m) return normalized;
      const hour = Number(m[1]) % 12 || 12;
      const minute = m[2];
      return `${hour}:${minute}`;
    }
    const hhmm = normalized.match(/^(\d{1,2}):(\d{2})$/);
    if (hhmm) {
      let hour = Number(hhmm[1]);
      const minute = hhmm[2];
      hour = hour % 12 || 12;
      return `${hour}:${minute}`;
    }
    return normalized;
  }

  function parseToMinutes(value: string) {
    if (!value) return 0;
    const normalized = value.trim().toUpperCase();
    const ampmMatch = normalized.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/);
    if (ampmMatch) {
      let hour = Number(ampmMatch[1]) % 12;
      const minute = Number(ampmMatch[2]);
      if (ampmMatch[3] === "PM") hour += 12;
      return hour * 60 + minute;
    }
    const hhmm = normalized.match(/^(\d{1,2}):(\d{2})$/);
    if (hhmm) {
      const hour = Number(hhmm[1]);
      const minute = Number(hhmm[2]);
      return hour * 60 + minute;
    }
    return 0;
  }

  function downloadWeeklySchedulePdf() {
    if (!studentData) return;

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const allTimeSlots = Array.from(
      new Map(
        (timeSlots.length > 0 ? timeSlots : studentData.schedule.map((block) => block.timeSlot))
          .map((slot) => [`${slot.startTime}-${slot.endTime}`, slot])
      ).values()
    );

    allTimeSlots.sort((a, b) => parseToMinutes(a.startTime) - parseToMinutes(b.startTime));

    const scheduleMap = new Map<string, typeof studentData.schedule[number]>();
    studentData.schedule.forEach((block) => {
      scheduleMap.set(`${block.timeSlot.day}|${block.timeSlot.startTime}-${block.timeSlot.endTime}`, block);
    });

    const tableBody = allTimeSlots.map((slot) => {
      const row: string[] = [];
      row.push(`${formatDisplayTime(slot.startTime)} - ${formatDisplayTime(slot.endTime)}`);

      days.forEach((day) => {
        const key = `${day}|${slot.startTime}-${slot.endTime}`;
        const block = scheduleMap.get(key);
        if (!block) {
          row.push("");
          return;
        }
        const cells: string[] = [block.subject.name];
        if (block.teacher?.user?.name) cells.push(block.teacher.user.name);
        if (block.room) cells.push(`Room ${block.room}`);
        row.push(cells.join("\n"));
      });

      return row;
    });

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const studentName = studentData.name;
    const safeName = studentName.replace(/\s+/g, "-").toLowerCase();
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
    doc.text("Senior High School - Weekly Schedule", 10, 17);
    doc.setFontSize(8.5);
    doc.text(`Generated: ${generatedAt}`, pageWidth - 10, 10, { align: "right" });

    // Info bar
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Student: ${studentName}`, 10, 31);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Section: ${studentData.section.name}`, pageWidth - 10, 31, { align: "right" });

    autoTable(doc, {
      startY: 36,
      head: [["Time", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]],
      body: tableBody,
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

    doc.save(`lnhs-weekly-schedule-${safeName}.pdf`);
  }

  const getDaySchedule = (day: string) => {
    if (!studentData) return [];
    return studentData.schedule
      .filter((block) => block.timeSlot.day === day)
      .sort((a, b) => a.timeSlot.startTime.localeCompare(b.timeSlot.startTime));
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold text-white">Student Dashboard</h1>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Sign Out
            </button>
          </div>
          <div className="text-white text-center py-12">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-6 text-white light:from-slate-100 light:to-slate-200 light:text-slate-900 md:px-6">
      <div className="w-full px-4 md:px-6 xl:px-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[256px_minmax(0,1fr)]">
          <StudentSidebar
            studentName={studentData.name}
            studentId={studentData.studentId}
            theme={theme}
            onToggleTheme={toggleTheme}
            onEditProfile={openProfileModal}
            onChangePassword={() => setShowPasswordModal(true)}
          />
          <div className="min-w-0">
        {/* Header */}
        <div className="mb-5 rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-xl light:border-slate-200 light:bg-white">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-white light:text-slate-900">Welcome, {studentData.name}</h1>
            <p className="text-slate-400 light:text-slate-500">Student ID: {studentData.studentId}</p>
          </div>
        </div>

        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 light:border-slate-200 light:bg-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 light:text-slate-500">Section</p>
            <p className="mt-2 text-xl font-bold text-white light:text-slate-900">{studentData.section.name}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 light:border-slate-200 light:bg-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 light:text-slate-500">Grade Level</p>
            <p className="mt-2 text-xl font-bold text-white light:text-slate-900">{studentData.gradeLevel}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 light:border-slate-200 light:bg-white">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 light:text-slate-500">Track</p>
            <p className="mt-2 text-xl font-bold text-white light:text-slate-900">{studentData.section.track}</p>
          </div>
        </div>

        {/* Weekly Schedule */}
        <div id="weekly-schedule" className="overflow-hidden rounded-lg border border-slate-700 bg-slate-800 light:border-slate-200 light:bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-slate-700 p-6 light:border-slate-200">
            <h2 className="text-2xl font-bold text-white light:text-slate-900">Weekly Schedule</h2>
            <button
              type="button"
              onClick={downloadWeeklySchedulePdf}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Download PDF
            </button>
          </div>

          <div className="p-6">
            <Timetable
              schedule={(studentData?.schedule ?? []).map((block) => ({
                day: block.timeSlot.day,
                timeSlot: `${block.timeSlot.startTime}-${block.timeSlot.endTime}`,
                subject: block.subject.name,
                section: studentData?.section?.name || "",
                room: block.room || null,
              }))}
              timeSlots={(timeSlots.length > 0 ? timeSlots : (studentData?.schedule ?? []).map(s => ({ startTime: s.timeSlot.startTime, endTime: s.timeSlot.endTime }))).map(ts => ({ startTime: ts.startTime, endTime: ts.endTime }))}
            />
          </div>
        </div>

        {/* Classes List */}
        <div className="mt-8 overflow-hidden rounded-lg border border-slate-700 bg-slate-800 light:border-slate-200 light:bg-white">
          <div className="border-b border-slate-700 p-6 light:border-slate-200">
            <h2 className="text-2xl font-bold text-white light:text-slate-900">All Classes</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-600 bg-slate-700 light:border-slate-200 light:bg-slate-100">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300 light:text-slate-600">Subject</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300 light:text-slate-600">Day</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300 light:text-slate-600">Time</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300 light:text-slate-600">Teacher</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300 light:text-slate-600">Room</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {studentData.schedule.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      No schedule available
                    </td>
                  </tr>
                ) : (
                  studentData.schedule.map((block) => (
                    <tr key={block.id} className="hover:bg-slate-700/50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-white light:text-slate-900">{block.subject.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-300 light:text-slate-600">{block.timeSlot.day}</td>
                      <td className="px-6 py-4 text-sm text-slate-300 light:text-slate-600">
                        {formatDisplayTime(block.timeSlot.startTime)} - {formatDisplayTime(block.timeSlot.endTime)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300 light:text-slate-600">{block.teacher.user.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-300 light:text-slate-600">{block.room || "-"}</td>
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

      {/* Edit Profile Modal */}
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
                  <p className="mt-1 text-lg font-semibold text-white">{studentData.name}</p>
                  <p className="mt-1 text-sm text-slate-300">Student ID: {studentData.studentId}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ["Email", studentData.email],
                    ["Section", studentData.section.name],
                    ["Grade Level", studentData.gradeLevel],
                    ["Track", studentData.section.track],
                    ["Date of Birth", studentData.dateOfBirth],
                    ["Gender", studentData.gender],
                    ["Phone", studentData.phone],
                    ["Guardian", studentData.guardianName],
                    ["Guardian Phone", studentData.guardianPhone],
                    ["Address", studentData.address],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-slate-600 bg-slate-700/40 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
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

      {/* Change Password Modal */}
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
