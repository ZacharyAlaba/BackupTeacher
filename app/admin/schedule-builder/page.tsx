"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MasterScheduleTable from "@/components/MasterScheduleTable";
import Timetable from "@/components/Timetable";

interface Teacher {
  id: string;
  user: { name: string; email: string };
}

interface Subject {
  id: string;
  name: string;
  gradeLevel: string;
}

interface Section {
  id: string;
  name: string;
  gradeLevel: string;
  track: string;
}

interface TimeSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
}

interface Schedule {
  id: string;
  teacher: { id: string; user: { name: string } };
  subject: { id: string; name: string };
  section: { id: string; name: string };
  timeSlot: { id: string; day: string; startTime: string; endTime: string };
  room: string | null;
}

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function ScheduleBuilderPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("G11");
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    teacherId: "",
    subjectId: "",
    sectionId: "",
    timeSlotId: "",
    room: "",
  });

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    try {
      const [schedulesRes, teachersRes, subjectsRes, sectionsRes, timeSlotsRes] = await Promise.all([
        fetch("/api/admin/schedules"),
        fetch("/api/admin/teachers"),
        fetch("/api/admin/subjects"),
        fetch("/api/admin/sections"),
        fetch("/api/admin/time-slots"),
      ]);

      if (schedulesRes.ok) setSchedules(await schedulesRes.json());
      if (teachersRes.ok) setTeachers(await teachersRes.json());
      if (subjectsRes.ok) setSubjects(await subjectsRes.json());
      if (sectionsRes.ok) setSections(await sectionsRes.json());
      if (timeSlotsRes.ok) setTimeSlots(await timeSlotsRes.json());
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (teachers.length > 0 && !selectedTeacherId) {
      setSelectedTeacherId(teachers[0].id);
    }
  }, [teachers, selectedTeacherId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!formData.teacherId || !formData.subjectId || !formData.sectionId || !formData.timeSlotId) {
      setError("All fields are required");
      return;
    }

    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId ? { ...formData, id: editingId } : formData;

      const response = await fetch("/api/admin/schedules", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        setFormData({ teacherId: "", subjectId: "", sectionId: "", timeSlotId: "", room: "" });
        setEditingId(null);
        setShowForm(false);
        await loadAllData();
      } else {
        setError(data.error || "Failed to save schedule");
      }
    } catch (error) {
      console.error("Failed to save schedule:", error);
      setError("Failed to save schedule");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this schedule assignment?")) return;
    try {
      const response = await fetch(`/api/admin/schedules?id=${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        await loadAllData();
      }
    } catch (error) {
      console.error("Failed to delete schedule:", error);
    }
  }

  function handleEdit(schedule: Schedule) {
    setFormData({
      teacherId: schedule.teacher.id || "",
      subjectId: schedule.subject.id || "",
      sectionId: schedule.section.id || "",
      timeSlotId: schedule.timeSlot.id || "",
      room: schedule.room || "",
    });
    setEditingId(schedule.id);
    setShowForm(true);
  }

  // Format time for display
  function formatTime(timeStr: string): string {
    if (!timeStr || timeStr.length < 5) return timeStr;
    return timeStr.slice(0, 5);
  }

  function getSubjectWeeklyTarget(subjectName: string): number {
    const isPELike =
      /(^|\b)(pe|hope|mapeh)(\b|$)/i.test(subjectName) ||
      /physical education|health optimization program for education/i.test(subjectName);
    return isPELike ? 1 : 4;
  }

  // Real-time conflict checking
  useEffect(() => {
    if (!formData.teacherId || !formData.subjectId || !formData.sectionId || !formData.timeSlotId) {
      setWarnings([]);
      return;
    }

    const newWarnings: string[] = [];
    const selectedTimeSlot = timeSlots.find(ts => ts.id === formData.timeSlotId);
    const selectedSubject = subjects.find(s => s.id === formData.subjectId);
    const selectedSection = sections.find(sec => sec.id === formData.sectionId);

    if (!selectedTimeSlot || !selectedSubject || !selectedSection) {
      setWarnings([]);
      return;
    }

    // Check teacher conflict at this time
    const teacherConflict = schedules.find(
      s => s.teacher.id === formData.teacherId && 
           s.timeSlot.id === formData.timeSlotId &&
           s.id !== editingId
    );
    if (teacherConflict) {
      newWarnings.push(`⚠️ Teacher already teaching ${teacherConflict.subject.name} to ${teacherConflict.section.name} at this time`);
    }

    // Check section conflict at this time
    const sectionConflict = schedules.find(
      s => s.section.id === formData.sectionId && 
           s.timeSlot.id === formData.timeSlotId &&
           s.id !== editingId
    );
    if (sectionConflict) {
      newWarnings.push(`⚠️ Section already has ${sectionConflict.subject.name} with ${sectionConflict.teacher.user.name} at this time`);
    }

    // Check subject hour cap (4 hours per week, 1 hour for PE/MAPEH)
    const isPE =
      /(^|\b)(pe|hope|mapeh)(\b|$)/i.test(selectedSubject.name) ||
      /physical education|health optimization program for education/i.test(selectedSubject.name);
    const subjectCap = isPE ? 1 : 4;
    const currentSubjectHours = schedules.filter(
      s => s.section.id === formData.sectionId && 
           s.subject.id === formData.subjectId &&
           s.id !== editingId
    ).length;

    const existingSubjectDays = new Set(
      schedules
        .filter(
          s =>
            s.section.id === formData.sectionId &&
            s.subject.id === formData.subjectId &&
            s.id !== editingId
        )
        .map((s) => s.timeSlot.day)
    );

    if (subjectCap > 1 && existingSubjectDays.has(selectedTimeSlot.day)) {
      newWarnings.push(
        `⚠️ ${selectedSubject.name} is already scheduled on ${selectedTimeSlot.day}. Use another day to preserve the 4-day + 1 flexible day pattern.`
      );
    }

    if (currentSubjectHours >= subjectCap) {
      newWarnings.push(`⚠️ ${selectedSubject.name} already has ${currentSubjectHours}/${subjectCap} hours for ${selectedSection.name}`);
    } else if (currentSubjectHours + 1 === subjectCap) {
      newWarnings.push(`ℹ️ This will complete ${selectedSubject.name} (${currentSubjectHours + 1}/${subjectCap} hours) for ${selectedSection.name}`);
    }

    // Check teacher day-off requirement
    const teacherSchedules = schedules.filter(
      s => s.teacher.id === formData.teacherId && s.id !== editingId
    );
    const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const daysUsed = new Set(teacherSchedules.map(s => s.timeSlot.day));
    daysUsed.add(selectedTimeSlot.day);
    const hasDayOff = weekdays.some(day => !daysUsed.has(day));
    
    if (!hasDayOff) {
      newWarnings.push(`⚠️ Teacher will have NO day off (working all 5 days)`);
    }

    setWarnings(newWarnings);
  }, [formData, schedules, timeSlots, subjects, sections, editingId]);

  const selectedTeacherSchedules = selectedTeacherId
    ? schedules.filter((schedule) => schedule.teacher.id === selectedTeacherId)
    : [];

  const sectionSubjectProgress = sections
    .filter((section) => section.gradeLevel === selectedGrade)
    .map((section) => {
      const sectionSchedules = schedules.filter((schedule) => schedule.section.id === section.id);
      const subjectCountMap = sectionSchedules.reduce((acc, schedule) => {
        const subjectName = schedule.subject.name;
        acc[subjectName] = (acc[subjectName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const subjectProgress = Object.entries(subjectCountMap)
        .map(([subjectName, assignedCount]) => {
          const targetCount = getSubjectWeeklyTarget(subjectName);
          return {
            subjectName,
            assignedCount,
            targetCount,
          };
        })
        .sort((a, b) => a.subjectName.localeCompare(b.subjectName));

      return {
        sectionId: section.id,
        sectionName: section.name,
        subjectProgress,
      };
    });

  const displayedSectionSubjectProgress = sectionSubjectProgress
    .map((section) => ({
      ...section,
      subjectProgress: showIncompleteOnly
        ? section.subjectProgress.filter((entry) => entry.assignedCount < entry.targetCount)
        : section.subjectProgress,
    }))
    .filter((section) => !showIncompleteOnly || section.subjectProgress.length > 0);

  const fixedBreakSlots = [
    { startTime: "09:45", endTime: "10:00" },
    { startTime: "12:00", endTime: "13:00" },
  ];

  const timetableSchedule = [
    ...selectedTeacherSchedules.map((schedule) => ({
      day: schedule.timeSlot.day,
      timeSlot: `${formatTime(schedule.timeSlot.startTime)}-${formatTime(schedule.timeSlot.endTime)}`,
      subject: schedule.subject.name,
      section: schedule.section.name,
      room: schedule.room,
    })),
    ...WEEK_DAYS.flatMap((day) => [
      {
        day,
        timeSlot: `${formatTime(fixedBreakSlots[0].startTime)}-${formatTime(fixedBreakSlots[0].endTime)}`,
        subject: "RECESS",
        section: "",
        room: null,
      },
      {
        day,
        timeSlot: `${formatTime(fixedBreakSlots[1].startTime)}-${formatTime(fixedBreakSlots[1].endTime)}`,
        subject: "LUNCH BREAK",
        section: "",
        room: null,
      },
    ]),
  ];

  const timetableSlots = Array.from(
    new Map(
      [...timeSlots, ...fixedBreakSlots].map((slot) => {
        const startTime = formatTime(slot.startTime);
        const endTime = formatTime(slot.endTime);
        return [`${startTime}-${endTime}`, { startTime, endTime }] as const;
      })
    ).values()
  ).sort((a, b) => {
    const left = Number(a.startTime.replace(":", ""));
    const right = Number(b.startTime.replace(":", ""));
    return left - right;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Schedule Builder</h1>
          <p className="text-slate-400">Assign teachers to classes and manage schedules</p>
        </div>

        <div className="mb-8 rounded-xl border border-slate-700 bg-slate-800 p-6">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Scheduling Grid</h2>
              <p className="text-sm text-slate-400">Assign teachers to section time slots</p>
            </div>
          </div>

          <MasterScheduleTable onSchedulesUpdate={setSchedules} />
        </div>

        <div className="mb-8 rounded-xl border border-slate-700 bg-slate-800 p-6">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Teacher Timetable</h2>
              <p className="text-sm text-slate-400">The weekly teacher schedule view</p>
            </div>
            <div className="w-full max-w-md">
              <label className="mb-2 block text-sm text-slate-300">Select Teacher</label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">Select teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!selectedTeacherId ? (
            <p className="text-slate-400">Select a teacher to view the timetable.</p>
          ) : timetableSlots.length === 0 ? (
            <p className="text-slate-400">No time slots available yet.</p>
          ) : (
            <Timetable schedule={timetableSchedule} timeSlots={timetableSlots} />
          )}
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-900/20 p-3 text-red-200">{error}</div>}
      </div>
    </div>
  );
}
