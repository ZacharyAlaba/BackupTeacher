"use client";

import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTeacherTheme } from "@/lib/useTeacherTheme";

type StudentItem = {
  id: string;
  studentId: string;
  name: string;
  email: string;
};

type SectionItem = {
  id: string;
  name: string;
  gradeLevel: string;
  track: string;
  students: StudentItem[];
};

type SubjectItem = {
  id: string;
  name: string;
  gradeLevel: string;
  track: string | null;
};

type AttendanceRecord = {
  id: string;
  studentId: string;
  subjectId: string;
  sectionId: string;
  gradingPeriod: string;
  academicYear: string;
  date?: string | null;
  status: string;
  remarks?: string | null;
  student: {
    id: string;
    studentId: string;
    user: { name: string; email: string };
  };
  subject: {
    id: string;
    name: string;
  };
};

export default function TeacherAttendancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, toggleTheme } = useTeacherTheme();
  const [academicYear, setAcademicYear] = useState("");
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [sectionSubjectAssignments, setSectionSubjectAssignments] = useState<Array<{ sectionId: string; subjectId: string; subjectName: string }>>([]);
  const [classList, setClassList] = useState<StudentItem[]>([]);
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkImportResult, setBulkImportResult] = useState<any>(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  const [addStudentResult, setAddStudentResult] = useState<{ studentId: string; name: string; email: string; tempPassword: string } | null>(null);
  const [addStudentError, setAddStudentError] = useState<string | null>(null);
  const [gradingPeriod, setGradingPeriod] = useState("Quarter 1");
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});
  const [remarksDrafts, setRemarksDrafts] = useState<Record<string, string>>({});
  const [statusDraftsByContext, setStatusDraftsByContext] = useState<Record<string, Record<string, string>>>({});
  const [remarksDraftsByContext, setRemarksDraftsByContext] = useState<Record<string, Record<string, string>>>({});
  const [legendStatus, setLegendStatus] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [savingStudentId, setSavingStudentId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login/teacher");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    let cancelled = false;

    async function loadAttendance() {
      try {
        const response = await fetch("/api/teacher/attendance", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (cancelled) {
          return;
        }

        const nextSections = data.sections || [];
        const nextAssignments = data.sectionSubjectAssignments || [];
        const nextSubjects = data.subjects || [];

        setAcademicYear(data.academicYear || "");
        setSections(nextSections);
        setSubjects(nextSubjects);
        setSectionSubjectAssignments(nextAssignments);
        setAttendanceRecords(data.attendanceRecords || []);

        const firstSection = nextSections[0];
        if (firstSection) {
          const firstAssignment = nextAssignments.find(
            (assignment: { sectionId: string; subjectId: string; subjectName: string }) =>
              assignment.sectionId === firstSection.id
          );
          const firstSubjectId = firstAssignment?.subjectId || nextSubjects[0]?.id || "";
          setSelectedSectionId(firstSection.id);
          setSelectedSubjectId(firstSubjectId);
        }
      } catch (error) {
        console.error("Failed to load attendance:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAttendance();
    return () => {
      cancelled = true;
    };
  }, [status]);

  const selectedSection = sections.find((section) => section.id === selectedSectionId) || null;

  const selectedStudents = useMemo(() => classList, [classList]);

  const availableSubjects = useMemo(() => {
    if (!selectedSection) {
      return subjects;
    }

    const assignedSubjectIds = sectionSubjectAssignments
      .filter((assignment) => assignment.sectionId === selectedSection.id)
      .map((assignment) => assignment.subjectId);

    return subjects.filter((subject) => assignedSubjectIds.includes(subject.id));
  }, [subjects, selectedSection, sectionSubjectAssignments]);

  useEffect(() => {
    if (!sectionSubjectAssignments.length) {
      return;
    }

    if (!selectedSectionId) {
      const firstAssignment = sectionSubjectAssignments[0];
      setSelectedSectionId(firstAssignment.sectionId);
      setSelectedSubjectId(firstAssignment.subjectId);
      return;
    }

    const selectedAssignment = sectionSubjectAssignments.find(
      (assignment) => assignment.sectionId === selectedSectionId
    );

    if (!selectedAssignment) {
      const firstAssignment = sectionSubjectAssignments[0];
      setSelectedSectionId(firstAssignment.sectionId);
      setSelectedSubjectId(firstAssignment.subjectId);
      return;
    }

    if (!selectedSubjectId || !availableSubjects.some((subject) => subject.id === selectedSubjectId)) {
      setSelectedSubjectId(selectedAssignment.subjectId);
    }
  }, [availableSubjects, sectionSubjectAssignments, selectedSectionId, selectedSubjectId]);

  const loadClassList = useCallback(async () => {
    if (!selectedSectionId || !selectedSubjectId) {
      setClassList([]);
      return;
    }

    const selectedSectionStudents = selectedSection?.students || [];
    if (selectedSectionStudents.length > 0) {
      setClassList(
        selectedSectionStudents.map((student: any) => ({
          id: student.id ?? student.studentId,
          studentId: student.studentId ?? student.studentNumber ?? student.id,
          name: student.name,
          email: student.email,
        }))
      );
    }

    try {
      const response = await fetch(
        `/api/teacher/subject-enrollment?sectionId=${encodeURIComponent(selectedSectionId)}&subjectId=${encodeURIComponent(selectedSubjectId)}`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        if (selectedSectionStudents.length > 0) {
          setClassList(
            selectedSectionStudents.map((student: any) => ({
              id: student.id ?? student.studentId,
              studentId: student.studentId ?? student.studentNumber ?? student.id,
              name: student.name,
              email: student.email,
            }))
          );
        } else {
          setClassList([]);
        }
        return;
      }

      const data = await response.json();
      const students = (data.students || selectedSectionStudents || []).map((student: any) => ({
        id: student.id ?? student.studentId,
        studentId: student.studentId ?? student.studentNumber ?? student.id,
        name: student.name,
        email: student.email,
      }));
      setClassList(students);
    } catch (error) {
      console.error("Failed to load class list:", error);
      if (selectedSectionStudents.length > 0) {
        setClassList(
          selectedSectionStudents.map((student: any) => ({
            id: student.id ?? student.studentId,
            studentId: student.studentId ?? student.studentNumber ?? student.id,
            name: student.name,
            email: student.email,
          }))
        );
      } else {
        setClassList([]);
      }
    }
  }, [selectedSectionId, selectedSubjectId, selectedSection]);

  useEffect(() => {
    loadClassList();
  }, [loadClassList]);

  const attendanceDates = useMemo(
    () => [
      { value: "2026-08-17", label: "Aug 17" },
      { value: "2026-08-18", label: "Aug 18" },
      { value: "2026-08-19", label: "Aug 19" },
      { value: "2026-08-20", label: "Aug 20" },
      { value: "2026-08-21", label: "Aug 21" },
    ],
    []
  );

  const recordLookup = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    attendanceRecords.forEach((record) => {
      if (!record.subjectId || !record.studentId || !record.gradingPeriod) {
        return;
      }
      const dateKey = record.date || attendanceDates[0]?.value || "";
      const key = `${record.studentId}-${record.subjectId}-${record.gradingPeriod}-${dateKey}`;
      map.set(key, record);
    });
    return map;
  }, [attendanceRecords, attendanceDates]);

  const matrixDates = useMemo(() => attendanceDates.map((date) => date.label), [attendanceDates]);
  const statusOptions = [
    { value: "PRESENT", label: "Present", symbol: "✓", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
    { value: "ABSENT", label: "Absent", symbol: "-", className: "border-rose-500/30 bg-rose-500/10 text-rose-300" },
    { value: "LATE", label: "Arrived late", symbol: "△", className: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
    { value: "LEFT_EARLY", label: "Left early", symbol: "◇", className: "border-orange-500/30 bg-orange-500/10 text-orange-300" },
  ] as const;

  const normalizeStatusValue = (value: string) => value;
  const attendanceContextKey = useMemo(() => `${selectedSectionId}|${selectedSubjectId}|${gradingPeriod}`, [selectedSectionId, selectedSubjectId, gradingPeriod]);

  useEffect(() => {
    if (!selectedSection || !selectedSubjectId) {
      return;
    }

    const nextStatus: Record<string, string> = {};
    const nextRemarks: Record<string, string> = {};
    const cachedStatus = statusDraftsByContext[attendanceContextKey] || {};
    const cachedRemarks = remarksDraftsByContext[attendanceContextKey] || {};

    classList.forEach((student) => {
      const studentRecords = attendanceRecords.filter(
        (record) =>
          record.studentId === student.id &&
          record.subjectId === selectedSubjectId &&
          record.gradingPeriod === gradingPeriod
      );

      attendanceDates.forEach(({ value }, index) => {
        const cellKey = `${student.id}-${index}`;
        const record = studentRecords.find((entry) => (entry.date || attendanceDates[0]?.value || "") === value);
        const loadedStatus = record ? String(record.status || "") : "";

        if (Object.prototype.hasOwnProperty.call(cachedStatus, cellKey)) {
          nextStatus[cellKey] = cachedStatus[cellKey];
        } else {
          nextStatus[cellKey] = loadedStatus;
        }
      });

      const latestRecord = studentRecords.at(-1) || null;
      if (Object.prototype.hasOwnProperty.call(cachedRemarks, student.id)) {
        nextRemarks[student.id] = cachedRemarks[student.id];
      } else if (latestRecord) {
        nextRemarks[student.id] = latestRecord.remarks || "";
      } else {
        nextRemarks[student.id] = "";
      }
    });

    setStatusDrafts((current) => {
      const isEqual =
        Object.keys(nextStatus).length === Object.keys(current).length &&
        Object.keys(nextStatus).every((key) => current[key] === nextStatus[key]);
      return isEqual ? current : nextStatus;
    });

    setRemarksDrafts((current) => {
      const isEqual =
        Object.keys(nextRemarks).length === Object.keys(current).length &&
        Object.keys(nextRemarks).every((key) => current[key] === nextRemarks[key]);
      return isEqual ? current : nextRemarks;
    });
  }, [
    classList,
    selectedSection,
    selectedSubjectId,
    gradingPeriod,
    recordLookup,
    matrixDates,
    attendanceContextKey,
    statusDraftsByContext,
    remarksDraftsByContext,
  ]);

  async function handleBulkImport(e: FormEvent) {
    e.preventDefault();

    if (!bulkImportFile) {
      alert("Please select a file to import");
      return;
    }

    if (!selectedSectionId || !selectedSubjectId) {
      alert("Please select a section and subject before importing.");
      return;
    }

    setBulkImporting(true);
    setBulkImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", bulkImportFile);
      formData.append("subjectId", selectedSubjectId);
      formData.append("sectionId", selectedSectionId);

      const response = await fetch("/api/teacher/subject-enrollment/bulk-import", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        alert(`Error: ${result.error || "Failed to import students."}`);
        setBulkImportResult(result);
        return;
      }

      setBulkImportResult(result);
      setBulkImportFile(null);
      await loadClassList();
    } catch (error) {
      console.error("Failed to import class list:", error);
      alert("Failed to import class list");
    } finally {
      setBulkImporting(false);
    }
  }

  async function handleAddStudent(e: FormEvent) {
    e.preventDefault();

    if (!newStudentName || !newStudentEmail) {
      setAddStudentError("Name and email are required");
      return;
    }

    if (!selectedSectionId) {
      setAddStudentError("Please select a section first.");
      return;
    }

    setAddingStudent(true);
    setAddStudentError(null);
    setAddStudentResult(null);

    try {
      const response = await fetch("/api/teacher/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newStudentName,
          email: newStudentEmail,
          sectionId: selectedSectionId,
          subjectId: selectedSubjectId,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setAddStudentError(result.error || "Failed to add student.");
        return;
      }

      setAddStudentResult(result);
      setNewStudentName("");
      setNewStudentEmail("");
      await loadClassList();
    } catch (error) {
      console.error("Failed to add student:", error);
      setAddStudentError("Failed to add student");
    } finally {
      setAddingStudent(false);
    }
  }

  function setStudentStatus(studentId: string, dateIndex: number, value: string) {
    const cellKey = `${studentId}-${dateIndex}`;
    setStatusDrafts((current) => ({ ...current, [cellKey]: value }));
    setStatusDraftsByContext((current) => ({
      ...current,
      [attendanceContextKey]: {
        ...(current[attendanceContextKey] || {}),
        [cellKey]: value,
      },
    }));
  }

  async function saveAttendance(studentId: string) {
    if (!selectedSectionId || !selectedSubjectId || !selectedSection) {
      return;
    }

    const statusesToSave = attendanceDates
      .map(({ value }, index) => {
        const rawStatusValue = statusDrafts[`${studentId}-${index}`];
        if (!rawStatusValue) {
          return null;
        }
        return {
          date: value,
          status: normalizeStatusValue(rawStatusValue),
        };
      })
      .filter((entry): entry is { date: string; status: string } => Boolean(entry));

    if (statusesToSave.length === 0) {
      setMessage("Select at least one date status first.");
      return;
    }

    setSavingStudentId(studentId);
    setMessage("");

    try {
      for (const statusEntry of statusesToSave) {
        const response = await fetch("/api/teacher/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            subjectId: selectedSubjectId,
            sectionId: selectedSectionId,
            gradingPeriod,
            date: statusEntry.date,
            status: statusEntry.status,
            remarks: remarksDrafts[studentId] || "",
            academicYear,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          setMessage(data.message || "Failed to save attendance");
          return;
        }
      }

      setMessage("Attendance saved successfully.");
      
      // Refresh attendance records after a short delay to reflect changes
      setTimeout(async () => {
        try {
          const refreshResponse = await fetch("/api/teacher/attendance", { cache: "no-store" });
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            setAttendanceRecords(refreshData.attendanceRecords || []);
          }
        } catch (e) {
          console.error("Failed to refresh attendance records:", e);
        }
      }, 500);
    } catch (error) {
      console.error("Save error:", error);
      setMessage("Failed to save attendance: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSavingStudentId("");
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-600">
        Loading attendance...
      </div>
    );
  }

  if (status !== "authenticated" || session?.user?.role !== "TEACHER") {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#030d1a] px-4 py-8 text-white light:bg-slate-100 light:text-slate-900">
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/teacher")}
            className="text-sm font-medium text-cyan-400 hover:text-cyan-300 light:text-cyan-700 light:hover:text-cyan-600"
          >
            ← Back to Teacher Dashboard
          </button>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={toggleTheme}
              className="text-sm font-medium text-slate-400 hover:text-slate-300 light:text-slate-500 light:hover:text-slate-700"
            >
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login/teacher" })}
              className="text-sm font-medium text-slate-400 hover:text-slate-300 light:text-slate-500 light:hover:text-slate-700"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-[#071a2d]/90 p-4 shadow-2xl shadow-slate-950/50 light:border-slate-200 light:bg-white light:shadow-slate-200/50">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm text-slate-300 light:text-slate-600">Section</label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#0f2238] px-4 py-3 text-white outline-none transition focus:border-cyan-500 light:border-slate-300 light:bg-slate-50 light:text-slate-900"
              >
                <option value="">Select section</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300 light:text-slate-600">Subject</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#0f2238] px-4 py-3 text-white outline-none transition focus:border-cyan-500 light:border-slate-300 light:bg-slate-50 light:text-slate-900"
              >
                <option value="">Select subject</option>
                {availableSubjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300 light:text-slate-600">Grading Period</label>
              <select
                value={gradingPeriod}
                onChange={(e) => setGradingPeriod(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#0f2238] px-4 py-3 text-white outline-none transition focus:border-cyan-500 light:border-slate-300 light:bg-slate-50 light:text-slate-900"
              >
                <option>Quarter 1</option>
                <option>Quarter 2</option>
                <option>Quarter 3</option>
                <option>Quarter 4</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-700 bg-[#071a2d]/90 p-5 shadow-2xl shadow-slate-950/30 light:border-slate-200 light:bg-white light:shadow-slate-200/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white light:text-slate-900">Add Student</h2>
              <p className="mt-2 text-sm text-slate-400 light:text-slate-500">Add a single student directly to this section's class list.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAddStudent((current) => !current);
                setAddStudentError(null);
                setAddStudentResult(null);
              }}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              {showAddStudent ? "Cancel" : "Add Student"}
            </button>
          </div>

          {showAddStudent && (
            <form onSubmit={handleAddStudent} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300 light:text-slate-600">Full Name *</label>
                  <input
                    type="text"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    className="w-full rounded-xl border border-slate-600 bg-[#12304a] px-4 py-3 text-white outline-none transition focus:border-cyan-500 light:border-slate-300 light:bg-slate-50 light:text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300 light:text-slate-600">Email *</label>
                  <input
                    type="email"
                    value={newStudentEmail}
                    onChange={(e) => setNewStudentEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-600 bg-[#12304a] px-4 py-3 text-white outline-none transition focus:border-cyan-500 light:border-slate-300 light:bg-slate-50 light:text-slate-900"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={addingStudent || !selectedSectionId}
                className="rounded-xl bg-[#21c55d] px-6 py-3 font-semibold text-white hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addingStudent ? "Adding..." : "Save Student"}
              </button>
            </form>
          )}

          {addStudentError && (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{addStudentError}</div>
          )}

          {addStudentResult && (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              <p>{addStudentResult.name} was added ({addStudentResult.studentId}). This student now also appears in Admin &rarr; Students.</p>
              <p className="mt-1 text-slate-300">Temporary password for {addStudentResult.email}: <span className="font-mono font-semibold text-white">{addStudentResult.tempPassword}</span></p>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-700 bg-[#071a2d]/90 p-5 shadow-2xl shadow-slate-950/30 light:border-slate-200 light:bg-white light:shadow-slate-200/50">
          <h2 className="text-2xl font-semibold text-white light:text-slate-900">Bulk Import Class List</h2>
          <p className="mt-2 text-sm text-slate-400 light:text-slate-500">Upload a CSV or Excel file with columns: studentId, email, name. Rows that don't match an existing student are created automatically.</p>

          <form onSubmit={handleBulkImport} className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300 light:text-slate-600">CSV or Excel File *</label>
              <div className="flex items-center gap-3 rounded-xl border border-slate-600 bg-[#12304a] px-3 py-2 light:border-slate-300 light:bg-slate-50">
                <label className="cursor-pointer rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500">
                  Choose File
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => setBulkImportFile(e.target.files?.[0] || null)}
                    className="hidden"
                    required
                  />
                </label>
                <span className="text-sm text-slate-300 light:text-slate-600">{bulkImportFile ? bulkImportFile.name : "No file chosen"}</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-[#112b45] p-4 light:border-slate-200 light:bg-slate-50">
              <p className="mb-3 text-sm text-slate-300 light:text-slate-600">CSV / Excel Format Example:</p>
              <pre className="overflow-x-auto text-xs text-slate-400 light:text-slate-500">
studentId,email,name
G11-001,john.doe@school.edu,John Doe
G11-002,jane.smith@school.edu,Jane Smith
              </pre>
              <p className="mt-3 text-xs text-slate-400 light:text-slate-500">Existing students only need studentId or email to match. New students also need a name - they'll be created and will appear in Admin &rarr; Students automatically.</p>
            </div>

            <button
              type="submit"
              disabled={bulkImporting || !selectedSectionId || !selectedSubjectId}
              className="rounded-xl bg-[#21c55d] px-6 py-3 font-semibold text-white hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkImporting ? "Importing..." : "Import Students"}
            </button>
          </form>

          {bulkImportResult && (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-slate-600 bg-[#112b45] p-4 text-sm text-slate-300 light:border-slate-200 light:bg-slate-50 light:text-slate-600">
                <p>Imported: {bulkImportResult.success}</p>
                <p>Failed: {bulkImportResult.failed}</p>
              </div>
              {bulkImportResult.created?.length > 0 && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                  <p className="mb-2 font-semibold">New students created (now also in Admin &rarr; Students):</p>
                  {bulkImportResult.created.map((created: any) => (
                    <p key={created.studentId}>
                      {created.name} ({created.studentId}) - temp password: <span className="font-mono font-semibold text-white">{created.tempPassword}</span>
                    </p>
                  ))}
                </div>
              )}
              {bulkImportResult.errors?.length > 0 && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                  {bulkImportResult.errors.map((error: any) => (
                    <p key={`${error.row}-${error.student}`}>Row {error.row}: {error.error}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-700 bg-[#071a2d]/90 shadow-2xl shadow-slate-950/30 light:border-slate-200 light:bg-white light:shadow-slate-200/50">
          <div className="flex items-center justify-between border-b border-slate-700 bg-[#0c1d2f] px-4 py-3 light:border-slate-200 light:bg-slate-100">
            <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-300 light:text-slate-600">
              <span className="text-slate-400 light:text-slate-500">Status:</span>
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-medium ${option.className} ${legendStatus === option.value ? "ring-1 ring-white/50" : ""}`}
                  onClick={() => setLegendStatus(option.value)}
                >
                  <span className="h-2 w-2 rounded-full bg-current" /> {option.label.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="text-xs uppercase tracking-[0.16em] text-slate-400 light:text-slate-500">
              {selectedSection?.name || "DEWEY"} · {gradingPeriod}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr className="bg-[#0d1e2d] text-xs uppercase tracking-[0.18em] text-slate-400 light:bg-slate-100 light:text-slate-500">
                  <th className="border-b border-slate-700 px-4 py-3 font-medium light:border-slate-200">Student</th>
                  <th className="border-b border-slate-700 px-2 py-3 text-center font-medium light:border-slate-200">4</th>
                  <th className="border-b border-slate-700 px-2 py-3 text-center font-medium light:border-slate-200">0</th>
                  <th className="border-b border-slate-700 px-2 py-3 text-center font-medium light:border-slate-200">0</th>
                  <th className="border-b border-slate-700 px-2 py-3 text-center font-medium light:border-slate-200">0</th>
                  <th className="border-b border-slate-700 px-2 py-3 text-center font-medium light:border-slate-200">{matrixDates[0]}</th>
                  <th className="border-b border-slate-700 px-2 py-3 text-center font-medium light:border-slate-200">{matrixDates[1]}</th>
                  <th className="border-b border-slate-700 px-2 py-3 text-center font-medium light:border-slate-200">{matrixDates[2]}</th>
                  <th className="border-b border-slate-700 px-2 py-3 text-center font-medium light:border-slate-200">{matrixDates[3]}</th>
                  <th className="border-b border-slate-700 px-2 py-3 text-center font-medium light:border-slate-200">{matrixDates[4]}</th>
                  <th className="border-b border-slate-700 px-3 py-3 text-right font-medium light:border-slate-200">Action</th>
                </tr>
              </thead>
              <tbody>
                {selectedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-slate-400 light:text-slate-500">
                      No students found in this section.
                    </td>
                  </tr>
                ) : (
                  selectedStudents.map((student) => {
                    const presentCount = matrixDates.reduce((count, _, index) => {
                      return count + (statusDrafts[`${student.id}-${index}`] === "PRESENT" ? 1 : 0);
                    }, 0);

                    return (
                      <tr key={student.id} className="bg-[#091827] hover:bg-[#0d1e2d] light:bg-white light:hover:bg-slate-50">
                        <td className="border-b border-slate-800 px-4 py-3 align-middle light:border-slate-200">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-sm font-bold text-white">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-white light:text-slate-900">{student.name}</div>
                              <div className="text-[11px] text-slate-400 light:text-slate-500">{student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="border-b border-slate-800 px-2 py-3 align-middle light:border-slate-200">
                          <div className="grid grid-cols-4 gap-1 text-center text-xs font-semibold text-slate-200 light:text-slate-600">
                            <span className="rounded-lg border border-slate-700 bg-[#122539] px-1 py-1 light:border-slate-200 light:bg-slate-100">{presentCount}</span>
                            <span className="rounded-lg border border-slate-700 bg-[#122539] px-1 py-1 light:border-slate-200 light:bg-slate-100">0</span>
                            <span className="rounded-lg border border-slate-700 bg-[#122539] px-1 py-1 light:border-slate-200 light:bg-slate-100">0</span>
                            <span className="rounded-lg border border-slate-700 bg-[#122539] px-1 py-1 light:border-slate-200 light:bg-slate-100">0</span>
                          </div>
                        </td>
                        <td className="border-b border-slate-800 px-2 py-3 text-center align-middle light:border-slate-200">
                          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-[#122539] text-slate-300 light:border-slate-200 light:bg-slate-100 light:text-slate-500">-</div>
                        </td>
                        <td className="border-b border-slate-800 px-2 py-3 text-center align-middle light:border-slate-200">
                          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-[#122539] text-slate-300 light:border-slate-200 light:bg-slate-100 light:text-slate-500">-</div>
                        </td>
                        <td className="border-b border-slate-800 px-2 py-3 text-center align-middle light:border-slate-200">
                          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-[#122539] text-slate-300 light:border-slate-200 light:bg-slate-100 light:text-slate-500">-</div>
                        </td>
                        {attendanceDates.map(({ label }, index) => {
                          const isSelected = selectedStudentId === student.id && selectedDateIndex === index;
                          const currentStatus = statusDrafts[`${student.id}-${index}`] || "";
                          const statusObj = statusOptions.find((opt) => opt.value === currentStatus);

                          return (
                            <td key={`${student.id}-${index}`} className="border-b border-slate-800 px-2 py-3 align-middle relative light:border-slate-200">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedStudentId(student.id);
                                  setSelectedDateIndex(index);
                                  setShowStatusPicker(true);
                                }}
                                className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-semibold transition cursor-pointer ${
                                  statusObj
                                    ? statusObj.className
                                    : "border-slate-700 bg-[#122539] text-slate-400 light:border-slate-200 light:bg-slate-100 light:text-slate-400"
                                }`}
                              >
                                {statusObj
                                  ? statusObj.symbol
                                  : "-"}
                              </button>
                            </td>
                          );
                        })}
                        <td className="border-b border-slate-800 px-3 py-3 align-middle">
                          <button
                            type="button"
                            onClick={() => saveAttendance(student.id)}
                            disabled={savingStudentId === student.id || !selectedSubjectId}
                            className="rounded-lg bg-cyan-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingStudentId === student.id ? "Saving..." : "Save"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {showStatusPicker && selectedStudentId && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-black/60" 
                onClick={() => {
                  setShowStatusPicker(false);
                  setSelectedStudentId(null);
                }}
              />
              <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-[#0a1420] border-3 border-cyan-500 rounded-xl shadow-2xl p-6 min-w-[340px]">
                <div className="text-center text-white font-bold mb-5 text-xl">Select Status</div>
                <div className="space-y-3">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        if (selectedDateIndex === null) {
                          return;
                        }
                        setStudentStatus(selectedStudentId, selectedDateIndex, option.value);
                        setShowStatusPicker(false);
                        setSelectedStudentId(null);
                        setSelectedDateIndex(null);
                      }}
                      className={`w-full text-center px-5 py-3 rounded-lg text-base font-bold transition border-2 ${option.className} hover:shadow-xl active:scale-95`}
                    >
                      {option.symbol} {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-700 bg-[#071a2d]/90 p-4 shadow-2xl shadow-slate-950/30 light:border-slate-200 light:bg-white light:shadow-slate-200/50">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-2xl font-semibold text-white light:text-slate-900">Attendance Notes</h3>
            <p className="text-sm text-slate-400 light:text-slate-500">{availableSubjects.find((subject) => subject.id === selectedSubjectId)?.name || "Statistics and Probability"}</p>
          </div>
          <div className="mt-4 rounded-xl border border-slate-700 bg-[#112b45] p-4 text-sm text-slate-300 light:border-slate-200 light:bg-slate-50 light:text-slate-600">
            This view keeps student attendance aligned with the section assignment while still allowing the teacher to mark the current subject status.
          </div>
        </div>
      </div>
    </div>
  );
}
