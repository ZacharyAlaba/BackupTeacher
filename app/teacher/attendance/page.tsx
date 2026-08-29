"use client";

import * as XLSX from "xlsx";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTeacherTheme } from "@/lib/useTeacherTheme";
import TeacherSidebar from "@/components/TeacherSidebar";
import { ChevronDown, Download, Search } from "lucide-react";

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

type SectionSubjectAssignment = {
  sectionId: string;
  subjectId: string;
  subjectName: string;
  days: string[];
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

type TeacherProfile = {
  id: string;
  name: string;
  email: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  phone?: string | null;
  address?: string | null;
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
  const [sectionSearch, setSectionSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);
  const [subjectMenuOpen, setSubjectMenuOpen] = useState(false);
  const [sectionSubjectAssignments, setSectionSubjectAssignments] = useState<SectionSubjectAssignment[]>([]);
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
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendancePage, setAttendancePage] = useState(0);
  const [hoveredExcusedReason, setHoveredExcusedReason] = useState<{ reason: string; x: number; y: number } | null>(null);
  const [excusedReasonDialog, setExcusedReasonDialog] = useState<{ studentId: string; dateValue: string; reason: string } | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
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

  async function handleProfileSave(e: FormEvent) {
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

  async function handlePasswordChange(e: FormEvent) {
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

    async function loadTeacherProfile() {
      try {
        const response = await fetch("/api/teacher/profile", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (!cancelled) {
          setTeacherProfile(data);
        }
      } catch (error) {
        console.error("Failed to load teacher profile:", error);
      }
    }

    loadTeacherProfile();

    return () => {
      cancelled = true;
    };
  }, [status]);

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
            (assignment: SectionSubjectAssignment) =>
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

  const filteredSections = useMemo(() => {
    const query = sectionSearch.trim().toLowerCase();
    return query ? sections.filter((section) => section.name.toLowerCase().includes(query)) : sections;
  }, [sections, sectionSearch]);

  const filteredSubjects = useMemo(() => {
    const query = subjectSearch.trim().toLowerCase();
    return query ? availableSubjects.filter((subject) => subject.name.toLowerCase().includes(query)) : availableSubjects;
  }, [availableSubjects, subjectSearch]);

  useEffect(() => {
    setSectionSearch(selectedSection?.name || "");
  }, [selectedSectionId]);

  useEffect(() => {
    setSubjectSearch(availableSubjects.find((subject) => subject.id === selectedSubjectId)?.name || "");
  }, [selectedSubjectId, availableSubjects]);

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

  function exportAttendance() {
    const subjectName = subjects.find((subject) => subject.id === selectedSubjectId)?.name || "Subject";
    const sectionName = selectedSection?.name || "Section";
    const dateHeaders = attendanceDates.map(({ label, exportLabel }) => exportLabel || label || "Date");
    const sortedStudents = [...selectedStudents].sort((a, b) => a.name.localeCompare(b.name));

    const rows = [
      ["Student ID", "Name", "Email", "Section", "Subject", ...dateHeaders, "Remarks"],
      ...sortedStudents.map((student) => {
        const attendanceRow = [
          student.studentId,
          student.name,
          student.email,
          sectionName,
          subjectName,
        ];

        attendanceDates.forEach(({ value }) => {
          attendanceRow.push(statusDrafts[`${student.id}-${value}`] || "");
        });

        const remarks = attendanceDates
          .map(({ value }) => remarksDrafts[`${student.id}-${value}`] || "")
          .filter(Boolean)
          .join(" | ");

        attendanceRow.push(remarks);
        return attendanceRow;
      }),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const columnWidths = Array.from({ length: rows[0].length }, (_, index) => {
      const maxLength = rows.reduce((max, row) => {
        const cellValue = row[index];
        const text = cellValue == null ? "" : String(cellValue);
        return Math.max(max, text.length);
      }, 0);

      return { wch: Math.max(12, Math.min(28, maxLength + 2)) };
    });

    worksheet["!cols"] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

    const workbookBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
      compression: true,
    });

    const blob = new Blob([workbookBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sectionName}-${subjectName}-attendance.xlsx`.replace(/[^a-z0-9._-]+/gi, "-");
    link.click();
    URL.revokeObjectURL(url);
  }

  const attendanceDates = useMemo(
    () => {
      const [startYearText, endYearText] = academicYear.split("-");
      const startYear = Number(startYearText);
      const endYear = Number(endYearText);
      const assignment = sectionSubjectAssignments.find(
        (item) => item.sectionId === selectedSectionId && item.subjectId === selectedSubjectId
      );
      const scheduledDays = new Set(assignment?.days || []);
      const dates: Array<{ value: string; label: string; exportLabel: string }> = [];

      if (!startYear || !endYear || scheduledDays.size === 0) {
        return dates;
      }

      const startDate = new Date(startYear, 7, 1);
      const endDate = new Date(endYear, 5, 30);
      const date = new Date(startDate);

      while (date <= endDate) {
        const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
        if (scheduledDays.has(dayName)) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const value = `${year}-${month}-${day}`;
          dates.push({
            value,
            label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            exportLabel: date.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
          });
        }
        date.setDate(date.getDate() + 1);
      }

      return dates;
    },
    [academicYear, sectionSubjectAssignments, selectedSectionId, selectedSubjectId]
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

  const visibleAttendanceDates = useMemo(
    () => attendanceDates.slice(attendancePage * 5, attendancePage * 5 + 5),
    [attendanceDates, attendancePage]
  );
  const totalAttendancePages = Math.max(1, Math.ceil(attendanceDates.length / 5));
  const statusOptions = [
    { value: "PRESENT", label: "Present", symbol: "✓", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" },
    { value: "ABSENT", label: "Absent", symbol: "-", className: "border-rose-500/30 bg-rose-500/10 text-rose-300" },
    { value: "LATE", label: "Arrived late", symbol: "△", className: "border-amber-500/30 bg-amber-500/10 text-amber-300" },
    { value: "LEFT_EARLY", label: "Left early", symbol: "◇", className: "border-orange-500/30 bg-orange-500/10 text-orange-300" },
    { value: "EXCUSED", label: "Excused", symbol: "○", className: "border-sky-500/30 bg-sky-500/10 text-sky-300" },
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

      attendanceDates.forEach(({ value }) => {
        const cellKey = `${student.id}-${value}`;
        const record = studentRecords.find((entry) => (entry.date || attendanceDates[0]?.value || "") === value);
        const loadedStatus = record ? String(record.status || "") : "";

        if (Object.prototype.hasOwnProperty.call(cachedStatus, cellKey)) {
          nextStatus[cellKey] = cachedStatus[cellKey];
        } else {
          nextStatus[cellKey] = loadedStatus;
        }
      });

      attendanceDates.forEach(({ value }) => {
        const remarkKey = `${student.id}-${value}`;
        const record = studentRecords.find((entry) => (entry.date || attendanceDates[0]?.value || "") === value);
        if (Object.prototype.hasOwnProperty.call(cachedRemarks, remarkKey)) {
          nextRemarks[remarkKey] = cachedRemarks[remarkKey];
        } else {
          nextRemarks[remarkKey] = record?.remarks || "";
        }
      });
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
    attendanceDates,
    attendanceContextKey,
    statusDraftsByContext,
    remarksDraftsByContext,
  ]);

  useEffect(() => {
    if (attendanceDates.length === 0) {
      setAttendancePage(0);
      return;
    }

    const today = new Date();
    const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const currentDateIndex = attendanceDates.findIndex((date) => date.value >= todayValue);
    const targetIndex = currentDateIndex === -1 ? attendanceDates.length - 1 : currentDateIndex;
    setAttendancePage(Math.floor(targetIndex / 5));
  }, [attendanceDates, selectedSectionId, selectedSubjectId, gradingPeriod]);

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

  function setStudentStatus(studentId: string, dateValue: string, value: string) {
    const cellKey = `${studentId}-${dateValue}`;
    setStatusDrafts((current) => ({ ...current, [cellKey]: value }));
    setStatusDraftsByContext((current) => ({
      ...current,
      [attendanceContextKey]: {
        ...(current[attendanceContextKey] || {}),
        [cellKey]: value,
      },
    }));
  }

  function cycleStudentStatus(studentId: string, dateValue: string) {
    const cellKey = `${studentId}-${dateValue}`;
    const currentStatus = statusDrafts[cellKey] || "";
    const currentIndex = statusOptions.findIndex((option) => option.value === currentStatus);
    const nextIndex = (currentIndex + 1) % (statusOptions.length + 1);
    const nextValue = nextIndex === statusOptions.length ? "" : statusOptions[nextIndex].value;
    if (nextValue === "EXCUSED") {
      setExcusedReasonDialog({ studentId, dateValue, reason: remarksDrafts[`${studentId}-${dateValue}`] || "" });
      return;
    }
    setStudentStatus(studentId, dateValue, nextValue);
  }

  function confirmExcusedReason() {
    if (!excusedReasonDialog?.reason.trim()) {
      return;
    }

    const reason = excusedReasonDialog.reason.trim();
    const remarkKey = `${excusedReasonDialog.studentId}-${excusedReasonDialog.dateValue}`;
    setRemarksDrafts((current) => ({ ...current, [remarkKey]: reason }));
    setRemarksDraftsByContext((current) => ({
      ...current,
      [attendanceContextKey]: {
        ...(current[attendanceContextKey] || {}),
        [remarkKey]: reason,
      },
    }));
    setStudentStatus(excusedReasonDialog.studentId, excusedReasonDialog.dateValue, "EXCUSED");
    setExcusedReasonDialog(null);
  }

  async function saveAttendance() {
    if (!selectedSectionId || !selectedSubjectId || !selectedSection) {
      return;
    }

    const statusesToSave = selectedStudents.flatMap((student) =>
      attendanceDates.flatMap(({ value }) => {
        const rawStatusValue = statusDrafts[`${student.id}-${value}`];
        const recordKey = `${student.id}-${selectedSubjectId}-${gradingPeriod}-${value}`;
        if (!rawStatusValue && !recordLookup.has(recordKey)) {
          return [];
        }
        return [{ studentId: student.id, date: value, status: normalizeStatusValue(rawStatusValue || ""), remarks: remarksDrafts[`${student.id}-${value}`] || "" }];
      })
    );

    if (statusesToSave.length === 0) {
      setMessage("Select at least one date status first.");
      return;
    }

    setSavingAttendance(true);
    setMessage("");

    try {
      const response = await fetch("/api/teacher/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: selectedSubjectId,
          sectionId: selectedSectionId,
          gradingPeriod,
          academicYear,
          records: statusesToSave,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || "Failed to save attendance");
        return;
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
      setSavingAttendance(false);
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
    <div className="min-h-screen bg-[#061426] px-4 py-6 text-white light:bg-slate-100 light:text-slate-900">
      <div className="w-full">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[256px_minmax(0,1fr)]">
          <TeacherSidebar
            teacherName={teacherProfile?.name || session?.user?.name || "Teacher"}
            theme={theme}
            onToggleTheme={toggleTheme}
            onEditProfile={openProfileModal}
            onChangePassword={() => setShowPasswordModal(true)}
          />

          <div className="min-w-0">
            <div className="rounded-2xl border border-slate-700 bg-[#0a2340]/95 p-4 shadow-2xl shadow-slate-950/50 light:border-slate-200 light:bg-white light:shadow-slate-200/50">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm text-slate-300 light:text-slate-600">Section</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                    <input
                      type="search"
                      value={sectionSearch}
                      onChange={(e) => {
                        setSectionSearch(e.target.value);
                        setSectionMenuOpen(true);
                      }}
                      onFocus={() => setSectionMenuOpen(true)}
                      placeholder="Search sections..."
                      className="w-full rounded-xl border border-slate-700 bg-[#143653] py-3 pl-10 pr-10 text-white outline-none transition focus:border-cyan-500 light:border-slate-300 light:bg-slate-50 light:text-slate-900"
                    />
                    <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                    {sectionMenuOpen && (
                      <div className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-700 bg-[#143653] p-1 shadow-xl light:border-slate-300 light:bg-white">
                        {filteredSections.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-slate-400 light:text-slate-500">No sections found</p>
                        ) : (
                          filteredSections.map((section) => (
                            <button
                              key={section.id}
                              type="button"
                              onClick={() => {
                                setSelectedSectionId(section.id);
                                setSectionSearch(section.name);
                                setSectionMenuOpen(false);
                              }}
                              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-slate-700 light:text-slate-900 light:hover:bg-slate-100"
                            >
                              {section.name}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300 light:text-slate-600">Subject</label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                    <input
                      type="search"
                      value={subjectSearch}
                      onChange={(e) => {
                        setSubjectSearch(e.target.value);
                        setSubjectMenuOpen(true);
                      }}
                      onFocus={() => setSubjectMenuOpen(true)}
                      placeholder="Search subjects..."
                      className="w-full rounded-xl border border-slate-700 bg-[#143653] py-3 pl-10 pr-10 text-white outline-none transition focus:border-cyan-500 light:border-slate-300 light:bg-slate-50 light:text-slate-900"
                    />
                    <ChevronDown className="pointer-events-none absolute right-3 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                    {subjectMenuOpen && (
                      <div className="absolute z-30 mt-2 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-700 bg-[#143653] p-1 shadow-xl light:border-slate-300 light:bg-white">
                        {filteredSubjects.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-slate-400 light:text-slate-500">No subjects found</p>
                        ) : (
                          filteredSubjects.map((subject) => (
                            <button
                              key={subject.id}
                              type="button"
                              onClick={() => {
                                setSelectedSubjectId(subject.id);
                                setSubjectSearch(subject.name);
                                setSubjectMenuOpen(false);
                              }}
                              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-slate-700 light:text-slate-900 light:hover:bg-slate-100"
                            >
                              {subject.name}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300 light:text-slate-600">Grading Period</label>
                  <select
                    value={gradingPeriod}
                    onChange={(e) => setGradingPeriod(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-[#143653] px-4 py-3 text-white outline-none transition focus:border-cyan-500 light:border-slate-300 light:bg-slate-50 light:text-slate-900"
                  >
                    <option>Quarter 1</option>
                    <option>Quarter 2</option>
                    <option>Quarter 3</option>
                    <option>Quarter 4</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-700 bg-[#0a2340]/95 p-5 shadow-2xl shadow-slate-950/30 light:border-slate-200 light:bg-white light:shadow-slate-200/50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-white light:text-slate-900">Add Student</h2>
                  <p className="mt-2 text-sm text-slate-400 light:text-slate-500">Add a single student directly to this section&apos;s class list.</p>
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
                        className="w-full rounded-xl border border-slate-600 bg-[#17425d] px-4 py-3 text-white outline-none transition focus:border-cyan-500 light:border-slate-300 light:bg-slate-50 light:text-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300 light:text-slate-600">Email *</label>
                      <input
                        type="email"
                        value={newStudentEmail}
                        onChange={(e) => setNewStudentEmail(e.target.value)}
                        className="w-full rounded-xl border border-slate-600 bg-[#17425d] px-4 py-3 text-white outline-none transition focus:border-cyan-500 light:border-slate-300 light:bg-slate-50 light:text-slate-900"
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

            <div className="mt-6 rounded-2xl border border-slate-700 bg-[#0a2340]/95 p-5 shadow-2xl shadow-slate-950/30 light:border-slate-200 light:bg-white light:shadow-slate-200/50">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-white light:text-slate-900">Class List</h2>
                  <p className="mt-2 text-sm text-slate-400 light:text-slate-500">Import students or export the current attendance record.</p>
                </div>
                <button
                  type="button"
                  onClick={exportAttendance}
                  disabled={selectedStudents.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50 light:border-cyan-700 light:bg-cyan-100 light:text-cyan-800 light:hover:bg-cyan-200"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Export Attendance
                </button>
              </div>

              <h3 className="mt-5 text-lg font-semibold text-white light:text-slate-900">Bulk Import Class List</h3>
              <p className="mt-2 text-sm text-slate-400 light:text-slate-500">Upload a CSV or Excel file with columns: name, email. Student IDs are generated automatically; you may include studentId to match an existing student.</p>

              <form onSubmit={handleBulkImport} className="mt-4 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300 light:text-slate-600">CSV or Excel File *</label>
                  <div className="flex items-center gap-3 rounded-xl border border-slate-600 bg-[#17425d] px-3 py-2 light:border-slate-300 light:bg-slate-50">
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

                <div className="rounded-xl border border-slate-700 bg-[#16415d] p-4 light:border-slate-200 light:bg-slate-50">
                  <p className="mb-3 text-sm text-slate-300 light:text-slate-600">CSV / Excel Format Example:</p>
                  <pre className="overflow-x-auto text-xs text-slate-400 light:text-slate-500">
name,email
John Doe,john.doe@school.edu
Jane Smith,jane.smith@school.edu
                  </pre>
                  <p className="mt-3 text-xs text-slate-400 light:text-slate-500">Name and email are required, just like Add Student. Student IDs are generated automatically. You can optionally add a studentId column for matching existing students.</p>
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
                  <div className="rounded-xl border border-slate-600 bg-[#16415d] p-4 text-sm text-slate-300 light:border-slate-200 light:bg-slate-50 light:text-slate-600">
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

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-700 bg-[#0a2340]/95 shadow-2xl shadow-slate-950/30 light:border-slate-200 light:bg-white light:shadow-slate-200/50">
              <div className="flex items-center justify-between border-b border-slate-700 bg-[#102e4a] px-4 py-3 light:border-slate-200 light:bg-slate-100">
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-300 light:text-slate-600">
                  <span className="text-slate-400 light:text-slate-500">Status:</span>
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-medium ${option.className} ${legendStatus === option.value ? "ring-1 ring-white/50" : ""}`}
                      onClick={() => setLegendStatus(option.value)}
                    >
                      <span className="text-sm font-bold normal-case leading-none">{option.symbol}</span> {option.label.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
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
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-400 light:text-slate-500">
                      {selectedSection?.name || "DEWEY"} · {gradingPeriod}
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

                  <button
                    type="button"
                    onClick={() => saveAttendance()}
                    disabled={savingAttendance || !selectedSubjectId || selectedStudents.length === 0}
                    className="rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingAttendance ? "Saving..." : "Save Attendance"}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1080px] w-full border-separate border-spacing-0 text-left">
                  <thead>
                    <tr className="bg-[#123653] text-[10px] uppercase tracking-[0.16em] text-slate-400 light:bg-slate-100 light:text-slate-500">
                      <th className="sticky left-0 z-20 border-b border-slate-700 bg-[#123653] px-4 py-3 text-left font-semibold light:border-slate-200 light:bg-slate-100">Student</th>
                      {visibleAttendanceDates.map((date) => (
                        <th key={date.value} className="border-b border-slate-700 px-2 py-3 text-center font-semibold light:border-slate-200">{date.label}</th>
                      ))}
                      {statusOptions.map((option) => (
                        <th key={option.value} title={option.label} className="border-b border-slate-700 px-2 py-3 text-center font-semibold light:border-slate-200">
                          <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-1 ${option.className}`}>
                            <span className="text-sm normal-case leading-none">{option.symbol}</span>
                            <span className="hidden 2xl:inline">{option.label === "Arrived late" ? "Late" : option.label === "Left early" ? "Early" : option.label}</span>
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedStudents.length === 0 ? (
                      <tr>
                        <td colSpan={1 + statusOptions.length + attendanceDates.length} className="py-10 text-center text-slate-400 light:text-slate-500">
                          No students found in this section.
                        </td>
                      </tr>
                    ) : (
                      selectedStudents.map((student) => {
                        const statusCounts = statusOptions.reduce<Record<string, number>>((counts, option) => {
                          counts[option.value] = attendanceDates.reduce((count, date) => (
                            count + (statusDrafts[`${student.id}-${date.value}`] === option.value ? 1 : 0)
                          ), 0);
                          return counts;
                        }, {});

                        return (
                          <tr key={student.id} className="group bg-[#0d2943] transition-colors hover:bg-[#174766] light:bg-white light:hover:bg-slate-50">
                            <td className="sticky left-0 z-10 border-b border-slate-800 bg-[#0d2943] px-4 py-3 align-middle group-hover:bg-[#174766] light:border-slate-200 light:bg-white light:group-hover:bg-slate-50">
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

                            {visibleAttendanceDates.map(({ label, value }) => {
                              const currentStatus = statusDrafts[`${student.id}-${value}`] || "";
                              const statusObj = statusOptions.find((opt) => opt.value === currentStatus);
                              const attendanceRecord = recordLookup.get(`${student.id}-${selectedSubjectId}-${gradingPeriod}-${value}`);
                              const excusedReason = remarksDrafts[`${student.id}-${value}`] || attendanceRecord?.remarks || "";

                              return (
                                <td key={`${student.id}-${value}`} className="border-b border-slate-800 px-2 py-3 align-middle relative light:border-slate-200">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      cycleStudentStatus(student.id, value);
                                    }}
                                    aria-label={`${student.name} ${label} status: ${statusObj?.label || "unmarked"}. Click to change.`}
                                    onMouseEnter={(event) => {
                                      if (statusObj?.value === "EXCUSED") {
                                        setHoveredExcusedReason({ reason: excusedReason || "No reason provided", x: event.clientX, y: event.clientY });
                                      }
                                    }}
                                    onMouseMove={(event) => {
                                      if (statusObj?.value === "EXCUSED") {
                                        setHoveredExcusedReason({ reason: excusedReason || "No reason provided", x: event.clientX, y: event.clientY });
                                      }
                                    }}
                                    onMouseLeave={() => setHoveredExcusedReason(null)}
                                    className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-semibold transition cursor-pointer ${
                                      statusObj
                                        ? statusObj.className
                                        : "border-slate-700 bg-[#173a57] text-slate-300 light:border-slate-200 light:bg-slate-100 light:text-slate-400"
                                    }`}
                                  >
                                    {statusObj ? statusObj.symbol : "-"}
                                  </button>
                                </td>
                              );
                            })}

                            {statusOptions.map((option) => (
                              <td key={option.value} className="border-b border-slate-800 px-2 py-3 text-center align-middle light:border-slate-200">
                                <span className={`inline-flex min-w-8 justify-center rounded-md border px-2 py-1 text-xs font-semibold ${option.className}`}>
                                  {statusCounts[option.value]}
                                </span>
                              </td>
                            ))}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {hoveredExcusedReason && (
                <div
                  className="pointer-events-none fixed z-50 w-64 -translate-x-1/2 -translate-y-full rounded-lg border border-sky-400/50 bg-[#123653] px-4 py-3 text-left text-sm text-sky-100 shadow-2xl"
                  style={{ left: hoveredExcusedReason.x, top: hoveredExcusedReason.y - 12 }}
                >
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300">Excused reason</div>
                  <div className="break-words leading-5">{hoveredExcusedReason.reason}</div>
                </div>
              )}

              {excusedReasonDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
                  <div className="w-full max-w-md rounded-2xl border border-sky-400/40 bg-[#123653] p-6 shadow-2xl">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Attendance note</p>
                        <h3 className="mt-2 text-xl font-semibold text-white">Why is this student excused?</h3>
                        <p className="mt-2 text-sm text-slate-400">Add a short reason. This note will be saved with the attendance record.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExcusedReasonDialog(null)}
                        className="text-xl leading-none text-slate-400 transition hover:text-white"
                        aria-label="Close excused reason dialog"
                      >
                        ×
                      </button>
                    </div>

                    <textarea
                      autoFocus
                      value={excusedReasonDialog.reason}
                      onChange={(event) => setExcusedReasonDialog((current) => current ? { ...current, reason: event.target.value } : current)}
                      placeholder="Example: Sick leave, school activity, family emergency..."
                      rows={4}
                      className="w-full resize-none rounded-xl border border-slate-600 bg-[#17425d] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
                    />

                    <div className="mt-5 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setExcusedReasonDialog(null)}
                        className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmExcusedReason}
                        disabled={!excusedReasonDialog.reason.trim()}
                        className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Mark Excused
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {showProfileModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
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
                          ["Email", teacherProfile?.email],
                          ["Date of Birth", teacherProfile?.dateOfBirth],
                          ["Gender", teacherProfile?.gender],
                          ["Phone", teacherProfile?.phone],
                          ["Address", teacherProfile?.address],
                        ].map(([label, value]) => (
                          <div key={String(label)} className="rounded-lg border border-slate-600 bg-slate-700/50 p-3 light:border-slate-200 light:bg-white">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 light:text-slate-500">{String(label)}</p>
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
