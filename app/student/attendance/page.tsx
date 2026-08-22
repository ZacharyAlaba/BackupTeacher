"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
};

const statusOrder = ["PRESENT", "ABSENT", "LATE", "LEFT_EARLY"];

export default function StudentAttendancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<StudentAttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const grouped = useMemo(() => {
    const groups: Record<string, SubjectAttendanceSummary[]> = {};
    data?.attendance.forEach((a) => {
      const key = `${a.academicYear} - ${a.gradingPeriod}`;
      const subjectSummary = groups[key]?.find((summary) => summary.subjectName === a.subject.name);

      if (subjectSummary) {
        subjectSummary.counts[a.status] = (subjectSummary.counts[a.status] || 0) + 1;
        subjectSummary.total += 1;
        if (!subjectSummary.teacherNames.includes(a.teacher.user.name)) {
          subjectSummary.teacherNames.push(a.teacher.user.name);
        }
        return;
      }

      groups[key] = groups[key] || [];
      groups[key].push({
        subjectName: a.subject.name,
        teacherNames: [a.teacher.user.name],
        counts: { [a.status]: 1 },
        total: 1,
      });
    });
    return groups;
  }, [data]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-700 bg-slate-900/70 p-6 shadow-2xl backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Student Attendance</p>
            <h1 className="mt-2 text-3xl font-semibold">{data.name}</h1>
            <p className="mt-2 text-sm text-slate-400">{data.studentId} · {data.section.name} · {data.gradeLevel}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push('/student')} className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700">Back to Dashboard</button>
            <button onClick={() => signOut({ callbackUrl: '/login/student'})} className="rounded-xl bg-red-500/10 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/20">Logout</button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Attendance entries</p>
            <p className="mt-2 text-3xl font-semibold">{data.attendance.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Track</p>
            <p className="mt-2 text-3xl font-semibold">{data.section.track}</p>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {Object.keys(grouped).length === 0 ? (
            <div className="rounded-3xl border border-slate-700 bg-slate-900/70 p-8 text-center text-slate-400">No attendance has been posted yet.</div>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="rounded-3xl border border-slate-700 bg-slate-900/70 p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">{group}</h2>
                    <p className="text-sm text-slate-400">Status counts for each subject</p>
                  </div>
                  <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">{items.length} subjects</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px]">
                    <thead>
                      <tr className="border-b border-slate-700 text-left text-xs uppercase tracking-[0.18em] text-slate-400">
                        <th className="py-3 pr-4">Subject</th>
                        <th className="py-3 pr-4">Teacher</th>
                        <th className="py-3 pr-4">Attendance summary</th>
                        <th className="py-3 pr-4">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((summary) => (
                        <tr key={summary.subjectName} className="border-b border-slate-800">
                          <td className="py-4 pr-4 font-medium text-white">{summary.subjectName}</td>
                          <td className="py-4 pr-4 text-slate-300">{summary.teacherNames.join(", ")}</td>
                          <td className="py-4 pr-4">
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                              {statusOrder
                                .filter((status) => summary.counts[status])
                                .map((status) => (
                                  <span key={status} className={status === "PRESENT" ? "font-semibold text-emerald-300" : "text-slate-300"}>
                                    {statusLabels[status]}: {summary.counts[status]}
                                  </span>
                                ))}
                            </div>
                          </td>
                          <td className="py-4 pr-4 font-semibold text-white">{summary.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
