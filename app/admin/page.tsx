"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";


interface Stats {
  teachers: number;
  subjects: number;
  sections: number;
  timeSlots: number;
  schedules: number;
  students: number;
}

interface Teacher {
  id: string;
  name: string;
}

interface Section {
  id: string;
  name: string;
  gradeLevel: string;
  track?: string;
  _count?: { students: number };
}

interface TimeSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
}

interface Subject {
  id: string;
  name: string;
  gradeLevel: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  gradeLevel: string;
  sectionId?: string;
  section?: { id: string; name: string; gradeLevel: string };
}

interface Schedule {
  id: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  sectionId: string;
  sectionName: string;
  timeSlotId: string;
  timeSlot: TimeSlot;
  room?: string;
}

interface TeacherLoad {
  teacherId: string;
  teacherName: string;
  classCount: number;
  workloadPercent: number;
  color: string;
}

interface SystemAlert {
  id: string;
  type: "warning" | "info" | "error";
  message: string;
  timestamp: Date;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [staffLoad, setStaffLoad] = useState<TeacherLoad[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [sectionEnrollment, setSectionEnrollment] = useState<any[]>([]);
  const [csvRecords, setCsvRecords] = useState<Record<string, any> | null>(null);
  const [gradeStats, setGradeStats] = useState<any[]>([]);
  const [strandStats, setStrandStats] = useState<any[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status !== "authenticated") {
      return;
    }

    async function loadAllData() {
      try {
        setError("");
        const [statsRes, teachersRes, sectionsRes, timeSlotsRes, subjectsRes, schedulesRes, auditRes, studentsRes] = await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/teachers"),
          fetch("/api/admin/sections"),
          fetch("/api/admin/time-slots"),
          fetch("/api/admin/subjects"),
          fetch("/api/admin/schedules"),
          fetch("/api/admin/audit-log"),
          fetch("/api/admin/students"),
        ]);

        if (!statsRes.ok) {
          const body = await statsRes.json().catch(() => ({}));
          setError(body.error || "Failed to load stats");
        } else {
          setStats(await statsRes.json());
        }

        if (!teachersRes.ok) {
          const body = await teachersRes.json().catch(() => ({}));
          setError((prev) => prev || body.error || "Failed to load teachers");
        } else {
          const data = await teachersRes.json();
          setTeachers(
            data.map((t: any) => ({
              id: t.id,
              name: t.user?.name || "Unknown",
            }))
          );
        }

        if (!sectionsRes.ok) {
          const body = await sectionsRes.json().catch(() => ({}));
          setError((prev) => prev || body.error || "Failed to load sections");
        } else {
          const data = await sectionsRes.json();
          setSections(data.map((s: any) => ({
            id: s.id,
            name: s.name,
            gradeLevel: s.gradeLevel,
            track: s.track,
            _count: s._count,
          })));
        }

        if (!timeSlotsRes.ok) {
          const body = await timeSlotsRes.json().catch(() => ({}));
          setError((prev) => prev || body.error || "Failed to load time slots");
        } else {
          setTimeSlots(await timeSlotsRes.json());
        }

        if (!subjectsRes.ok) {
          const body = await subjectsRes.json().catch(() => ({}));
          setError((prev) => prev || body.error || "Failed to load subjects");
        } else {
          setSubjects(await subjectsRes.json());
        }

        if (!schedulesRes.ok) {
          const body = await schedulesRes.json().catch(() => ({}));
          setError((prev) => prev || body.error || "Failed to load schedules");
        } else {
          const data = await schedulesRes.json();
          setSchedules(
            data.map((s: any) => ({
              id: s.id,
              teacherId: s.teacherId,
              teacherName: s.teacher?.user?.name || "Unknown",
              subjectId: s.subjectId,
              subjectName: s.subject?.name || "",
              sectionId: s.sectionId,
              sectionName: s.section?.name || "",
              timeSlotId: s.timeSlotId,
              timeSlot: s.timeSlot,
              room: s.room || undefined,
            }))
          );
        }

        if (!auditRes.ok) {
          const body = await auditRes.json().catch(() => ({}));
          setError((prev) => prev || body.error || "Failed to load audit log");
        } else {
          setAuditLog(await auditRes.json());
        }

        if (!studentsRes.ok) {
          const body = await studentsRes.json().catch(() => ({}));
          setError((prev) => prev || body.error || "Failed to load students");
        } else {
          const studentData = await studentsRes.json();
          setStudents(studentData.map((s: any) => ({
            id: s.id,
            name: s.name,
            email: s.email,
            gradeLevel: s.gradeLevel,
            sectionId: s.sectionId,
            section: s.section,
          })));
        }

        setLastUpdated(new Date());
      } catch (error) {
        console.error("Failed to load data:", error);
        setError("Failed to load admin dashboard data. Check console for details.");
      }
    }

    loadAllData();
    // load recorded CSV data
    (async () => {
      try {
        const res = await fetch("/api/admin/records");
        if (res.ok) setCsvRecords(await res.json());
      } catch (e) {
        console.error("Failed to load CSV records", e);
      }
    })();
    const interval = setInterval(loadAllData, 10000);
    return () => clearInterval(interval);
  }, [status, router]);



  // Calculate staff load and alerts
  useEffect(() => {
    // Calculate staff load
    const teacherSchedules: Record<string, number> = {};
    const teacherNames: Record<string, string> = {};

    schedules.forEach((schedule) => {
      if (!teacherSchedules[schedule.teacherId]) {
        teacherSchedules[schedule.teacherId] = 0;
      }
      teacherSchedules[schedule.teacherId]++;
      teacherNames[schedule.teacherId] = schedule.teacherName;
    });

    const maxClassesPerTeacher = 25; // Reasonable max
    const loads: TeacherLoad[] = Object.entries(teacherSchedules)
      .map(([teacherId, classCount]) => {
        const workloadPercent = Math.round((classCount / maxClassesPerTeacher) * 100);
        let color = "emerald"; // Green < 70%
        if (workloadPercent >= 85) color = "red";
        else if (workloadPercent >= 70) color = "amber";
        else if (workloadPercent >= 50) color = "cyan";

        return {
          teacherId,
          teacherName: teacherNames[teacherId],
          classCount,
          workloadPercent: Math.min(100, workloadPercent),
          color,
        };
      })
      .sort((a, b) => b.workloadPercent - a.workloadPercent);

    setStaffLoad(loads);

    // Generate alerts
    const newAlerts: SystemAlert[] = [];

    // Check for high workload
    loads.forEach((load) => {
      if (load.workloadPercent >= 85) {
        newAlerts.push({
          id: `alert-${load.teacherId}`,
          type: "error",
          message: `${load.teacherName} is near maximum teaching load`,
          timestamp: new Date(),
        });
      }
    });

    // Check for empty sections
    sections.forEach((section, index) => {
      const hasTeacher = schedules.some((s) => s.sectionId === section.id);
      if (!hasTeacher) {
        newAlerts.push({
          id: `alert-section-${section.id ?? section.name ?? index}`,
          type: "warning",
          message: `${section.name} has no adviser assigned yet`,
          timestamp: new Date(),
        });
      }
    });

    // Check enrollment window
    newAlerts.push({
      id: "alert-enrollment",
      type: "info",
      message: `Grade 11 enrollment window opens in 3 days`,
      timestamp: new Date(),
    });

    setAlerts(newAlerts.slice(0, 3)); // Limit to 3 alerts
  }, [schedules, sections]);

  // Calculate section enrollment
  useEffect(() => {
    const enrollment = sections.map((section) => {
      const capacity = section.gradeLevel === "G11" ? 50 : 45; // Typical class size
      // Count students actually enrolled in this specific section
      const enrolled = students.filter(s => {
        return s.sectionId === section.id || (s.section && s.section.id === section.id);
      }).length;
      return {
        sectionId: section.id,
        sectionName: section.name,
        gradeLevel: section.gradeLevel,
        track: section.track,
        enrolled,
        capacity,
        percentage: Math.round((enrolled / capacity) * 100),
      };
    });
    setSectionEnrollment(enrollment);
  }, [sections, students]);

  // Calculate grade and strand statistics
  useEffect(() => {
    // Grade statistics - count students by grade level from students data
    const gradeCount: Record<string, number> = {};
    students.forEach((student) => {
      const grade = student.gradeLevel || "Unknown";
      gradeCount[grade] = (gradeCount[grade] || 0) + 1;
    });
    const grades = Object.entries(gradeCount).map(([label, value]) => ({ label, value }));
    setGradeStats(grades);

    // Strand statistics
    const strandCount: Record<string, number> = {};
    sections.forEach((section) => {
      const strand = section.track || "Unknown";
      strandCount[strand] = (strandCount[strand] || 0) + 1;
    });
    const strands = Object.entries(strandCount).map(([label, value]) => ({ label, value }));
    setStrandStats(strands);
  }, [sections, students]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Loading admin dashboard...
      </div>
    );
  }



  const getColorCode = (color: string) => {
    const colorMap: Record<string, string> = {
      red: "#ef4444",
      amber: "#f59e0b",
      cyan: "#06b6d4",
      emerald: "#10b981",
    };
    return colorMap[color] || "#10b981";
  };

  return (
    <>
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">ACADEMIC YEAR 2025-26</p>
          <h1 className="text-3xl font-bold text-white light:text-slate-900">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-400">Libertad NHS scheduling overview and daily administration.</p>
          {lastUpdated && (
            <p className="mt-1 text-xs text-slate-500">Live data · Updated {lastUpdated.toLocaleTimeString()}</p>
          )}
        </div>
        <button
          onClick={() => router.push("/admin/schedule-builder")}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-6 py-3 text-white font-medium transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Schedule Builder
        </button>
      </div>

      {/* Stat Cards Grid - 5 Columns */}
      <div className="mb-8 grid gap-4 md:grid-cols-5">
        {/* Assigned Classes - Blue */}
        <div className="group cursor-pointer rounded-lg border border-slate-700 bg-slate-800/50 p-5 hover:bg-slate-800 transition-all overflow-hidden relative light:bg-white light:hover:bg-slate-50" onClick={() => router.push("/admin/schedule-builder")}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
          <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-500/20 border border-blue-500/30">
            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-white light:text-slate-900 mb-1">{stats?.schedules || 0}</p>
          <p className="text-sm font-medium text-slate-300 mb-1">Assigned Classes</p>
          <p className="text-xs text-slate-400">Active assignments</p>
        </div>

        {/* Teachers - Green */}
        <div className="group cursor-pointer rounded-lg border border-slate-700 bg-slate-800/50 p-5 hover:bg-slate-800 transition-all overflow-hidden relative light:bg-white light:hover:bg-slate-50" onClick={() => router.push("/admin/teachers")}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-green-600"></div>
          <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-green-500/20 border border-green-500/30">
            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-white light:text-slate-900 mb-1">{stats?.teachers || 0}</p>
          <p className="text-sm font-medium text-slate-300 mb-1">Teachers</p>
          <p className="text-xs text-slate-400">Currently active</p>
        </div>

        {/* Subjects - Purple */}
        <div className="group cursor-pointer rounded-lg border border-slate-700 bg-slate-800/50 p-5 hover:bg-slate-800 transition-all overflow-hidden relative light:bg-white light:hover:bg-slate-50" onClick={() => router.push("/admin/subjects")}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
          <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-purple-500/20 border border-purple-500/30">
            <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-white light:text-slate-900 mb-1">{stats?.subjects || 0}</p>
          <p className="text-sm font-medium text-slate-300 mb-1">Subjects</p>
          <p className="text-xs text-slate-400">In curriculum</p>
        </div>

        {/* Sections - Orange */}
        <div className="group cursor-pointer rounded-lg border border-slate-700 bg-slate-800/50 p-5 hover:bg-slate-800 transition-all overflow-hidden relative light:bg-white light:hover:bg-slate-50" onClick={() => router.push("/admin/sections")}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-orange-600"></div>
          <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-orange-500/20 border border-orange-500/30">
            <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-white light:text-slate-900 mb-1">{stats?.sections || 0}</p>
          <p className="text-sm font-medium text-slate-300 mb-1">Sections</p>
          <p className="text-xs text-slate-400">In curriculum</p>
        </div>

        {/* Students - Teal */}
        <div className="group cursor-pointer rounded-lg border border-slate-700 bg-slate-800/50 p-5 hover:bg-slate-800 transition-all overflow-hidden relative light:bg-white light:hover:bg-slate-50" onClick={() => router.push("/admin/students")}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-teal-600"></div>
          <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
            <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 8.048M12 4.354a4 4 0 110 8.048M12 4.354L5.73 9.354M12 4.354l6.27 5M4.354 12c0 1.108.358 2.135.972 2.98m14.348 0c.614-.845.972-1.872.972-2.98m-14.348 0H2m20.348 0h2m-16.696 8c1.108 0 2.135.358 2.98.972m0 0a4 4 0 11-8.048 0m8.048 0l-5-5m0 0l-5 5" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-white light:text-slate-900 mb-1">{stats?.students || 0}</p>
          <p className="text-sm font-medium text-slate-300 mb-1">Students</p>
          <p className="text-xs text-slate-400">Currently enrolled</p>
        </div>
      </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300 flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-green-300 flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{success}</span>
          </div>
        )}

        {/* Main Content Grid - Statistics and Alerts */}
        <div className="mt-6 grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Left: Statistics Charts (2/3 width) */}
          <div className="lg:col-span-2 grid grid-cols-1 gap-4 rounded-lg border border-slate-700 bg-slate-800/50 p-4 lg:grid-cols-2 light:bg-white">
            {/* Grade Distribution */}
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-5 light:bg-slate-50">
              <h2 className="text-sm font-bold text-white light:text-slate-900 mb-4">Grade Distribution</h2>
              <div className="flex flex-col items-center">
                {gradeStats.length === 0 ? (
                  <p className="text-xs text-slate-400 py-12">No grade data available</p>
                ) : (
                  <div className="w-full">
                    <div className="flex justify-center mb-5">
                      <div className="relative" style={{ width: '180px', height: '180px' }}>
                        <svg width="180" height="180" viewBox="0 0 220 220" className="drop-shadow-lg">
                          {gradeStats.map((item, index) => {
                            const total = gradeStats.reduce((sum, s) => sum + s.value, 0);
                            const percentage = item.value / total;
                            let startAngle = gradeStats.slice(0, index).reduce((sum, s) => sum + (s.value / total) * 360, 0);
                            const endAngle = startAngle + percentage * 360;
                            const colors = ['#3b82f6', '#ef4444'];
                            const color = colors[index % colors.length];
                            
                            const radius = 65;
                            const innerRadius = 45;
                            const startAngleRad = (startAngle - 90) * (Math.PI / 180);
                            const endAngleRad = (endAngle - 90) * (Math.PI / 180);
                            
                            const x1 = 110 + radius * Math.cos(startAngleRad);
                            const y1 = 110 + radius * Math.sin(startAngleRad);
                            const x2 = 110 + radius * Math.cos(endAngleRad);
                            const y2 = 110 + radius * Math.sin(endAngleRad);
                            const x3 = 110 + innerRadius * Math.cos(endAngleRad);
                            const y3 = 110 + innerRadius * Math.sin(endAngleRad);
                            const x4 = 110 + innerRadius * Math.cos(startAngleRad);
                            const y4 = 110 + innerRadius * Math.sin(startAngleRad);
                            
                            const largeArc = endAngle - startAngle > 180 ? 1 : 0;
                            const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
                            
                            return <path key={index} d={d} fill={color} stroke="#0f172a" strokeWidth="2" />;
                          })}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="text-2xl font-bold text-white light:text-slate-900">{gradeStats.reduce((sum, s) => sum + s.value, 0)}</div>
                          <div className="text-xs text-slate-400 uppercase tracking-wider">Total</div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      {gradeStats.map((item, index) => {
                        const colors = ['#3b82f6', '#ef4444'];
                        const color = colors[index % colors.length];
                        const total = gradeStats.reduce((sum, s) => sum + s.value, 0);
                        const percentage = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
                        return (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></div>
                            <div>
                              <div className="text-xs font-medium text-slate-200">{item.label}</div>
                              <div className="text-xs text-slate-400">{percentage}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Strand Distribution */}
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-5 light:bg-slate-50">
              <h2 className="text-sm font-bold text-white light:text-slate-900 mb-4">Strand Distribution</h2>
              <div className="flex flex-col items-center">
                {strandStats.length === 0 ? (
                  <p className="text-xs text-slate-400 py-12">No strand data available</p>
                ) : (
                  <div className="w-full">
                    <div className="flex justify-center mb-5">
                      <div className="relative" style={{ width: '180px', height: '180px' }}>
                        <svg width="180" height="180" viewBox="0 0 220 220" className="drop-shadow-lg">
                          {strandStats.map((item, index) => {
                            const total = strandStats.reduce((sum, s) => sum + s.value, 0);
                            const percentage = item.value / total;
                            let startAngle = strandStats.slice(0, index).reduce((sum, s) => sum + (s.value / total) * 360, 0);
                            const endAngle = startAngle + percentage * 360;
                            const colors = ['#06b6d4', '#ec4899', '#10b981', '#f97316'];
                            const color = colors[index % colors.length];
                            
                            const radius = 65;
                            const innerRadius = 45;
                            const startAngleRad = (startAngle - 90) * (Math.PI / 180);
                            const endAngleRad = (endAngle - 90) * (Math.PI / 180);
                            
                            const x1 = 110 + radius * Math.cos(startAngleRad);
                            const y1 = 110 + radius * Math.sin(startAngleRad);
                            const x2 = 110 + radius * Math.cos(endAngleRad);
                            const y2 = 110 + radius * Math.sin(endAngleRad);
                            const x3 = 110 + innerRadius * Math.cos(endAngleRad);
                            const y3 = 110 + innerRadius * Math.sin(endAngleRad);
                            const x4 = 110 + innerRadius * Math.cos(startAngleRad);
                            const y4 = 110 + innerRadius * Math.sin(startAngleRad);
                            
                            const largeArc = endAngle - startAngle > 180 ? 1 : 0;
                            const d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
                            
                            return <path key={index} d={d} fill={color} stroke="#0f172a" strokeWidth="2" />;
                          })}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="text-2xl font-bold text-white light:text-slate-900">{strandStats.reduce((sum, s) => sum + s.value, 0)}</div>
                          <div className="text-xs text-slate-400 uppercase tracking-wider">Sections</div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      {strandStats.map((item, index) => {
                        const colors = ['#06b6d4', '#ec4899', '#10b981', '#f97316'];
                        const color = colors[index % colors.length];
                        const total = strandStats.reduce((sum, s) => sum + s.value, 0);
                        const percentage = total > 0 ? ((item.value / total) * 100).toFixed(0) : '0';
                        return (
                          <div key={index} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></div>
                            <div>
                              <div className="text-xs font-medium text-slate-200">{item.label}</div>
                              <div className="text-xs text-slate-400">{percentage}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Staff Load & Alerts (1/3 width) */}
          <div className="space-y-4">
            {/* Staff Load Widget */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-5 light:bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white light:text-slate-900">Staff Load</h3>
                <button
                  onClick={() => router.push("/admin/workload")}
                  className="text-xs text-slate-400 hover:text-slate-200 transition"
                >
                  View all
                </button>
              </div>
              <div className="space-y-3">
                {staffLoad.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">No teacher assignments recorded yet.</p>
                ) : (
                  staffLoad.slice(0, 3).map((load) => (
                    <div key={load.teacherId} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-200 truncate">{load.teacherName}</span>
                        <span className="text-xs font-semibold text-slate-300">{load.workloadPercent}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${load.workloadPercent}%`,
                            backgroundColor: getColorCode(load.color),
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* System Alerts Widget */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-5 light:bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white light:text-slate-900">System Alerts</h3>
                {alerts.length > 0 && (
                  <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full">
                    {alerts.length}
                  </span>
                )}
              </div>
              <div className="space-y-2.5">
                {alerts.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-3">No active alerts</p>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-lg p-3 bg-amber-50/10 border border-amber-500/30 backdrop-blur-sm"
                    >
                      <p className="text-xs font-semibold text-amber-100">{alert.message}</p>
                      <p className="text-xs text-amber-200/70 mt-1">
                        {alert.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section Enrollment Widget */}
        <div className="mt-8 rounded-lg border border-slate-700 bg-slate-800/50 p-5 light:bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white light:text-slate-900">Section Enrollment</h3>
            <span className="text-xs text-slate-400">{sectionEnrollment.length} Sections</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {sectionEnrollment.map((section) => (
              <div key={section.sectionId} className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 hover:bg-slate-900 transition light:bg-slate-50 light:hover:bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">{section.sectionName}</div>
                    <div className="text-xs text-slate-400">{section.gradeLevel} • {section.track}</div>
                  </div>
                  <span className="text-sm font-bold text-blue-300">{section.enrolled}/{section.capacity}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(section.percentage, 100)}%`,
                      backgroundColor: section.percentage >= 100 ? '#ef4444' : section.percentage >= 80 ? '#f59e0b' : section.percentage >= 50 ? '#3b82f6' : '#10b981',
                    }}
                  />
                </div>
                <div className="text-xs text-slate-400 mt-2 text-right">{section.percentage}% full</div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log Modal */}
        {showAuditLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-4xl rounded-xl bg-slate-800 border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Change Log</h2>
                <button
                  onClick={() => setShowAuditLog(false)}
                  className="text-slate-400 hover:text-white transition"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6">
                {auditLog.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No changes yet</p>
                ) : (
                  <div className="space-y-3">
                    {auditLog.map((entry, i) => (
                      <div key={i} className="rounded-lg border border-slate-700 bg-slate-900/50 p-4 hover:bg-slate-900 transition">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-white mb-1">
                              {entry.teacher} → {entry.subject} <span className="text-slate-400">({entry.section})</span>
                            </p>
                            <p className="text-sm text-slate-400">{entry.timeSlot}</p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-xs font-semibold text-green-300 bg-green-500/20 border border-green-500/30 px-3 py-1 rounded-lg mb-2">
                              {entry.action}
                            </p>
                            <p className="text-xs text-slate-500">
                              {new Date(entry.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </>
  );
}
