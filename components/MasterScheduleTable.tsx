"use client";

import React, { useCallback, useEffect, useState } from "react";

interface TimeSlot {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
}

interface ScheduleBlock {
  id: string;
  teacher: { id: string; user: { name: string } };
  subject: { id: string; name: string };
  section: { id: string; name: string; gradeLevel: string };
  timeSlot: TimeSlot;
  room: string | null;
}

interface MasterScheduleTableProps {
  onSchedulesUpdate?: (schedules: ScheduleBlock[]) => void;
}

interface Section {
  id: string;
  name: string;
  scheduleKey?: string | null;
  gradeLevel: string;
  track: string;
}

interface Teacher {
  id: string;
  user: { name: string };
  qualifications?: { subjectId: string }[];
}

interface Subject {
  id: string;
  name: string;
  scheduleKey?: string | null;
  gradeLevel: string;
  track?: string | null;
}

export default function MasterScheduleTable({ onSchedulesUpdate }: MasterScheduleTableProps) {
  const [schedules, setSchedules] = useState<ScheduleBlock[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedGrade, setSelectedGrade] = useState("G11");
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ sectionId: string; timeSlotId: string } | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [prefillLabel, setPrefillLabel] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [schedulesRes, sectionsRes, timeSlotsRes, teachersRes, subjectsRes] = await Promise.all([
        fetch("/api/admin/schedules", { cache: "no-store" }),
        fetch("/api/admin/sections", { cache: "no-store" }),
        fetch("/api/admin/time-slots", { cache: "no-store" }),
        fetch("/api/admin/teachers", { cache: "no-store" }),
        fetch("/api/admin/subjects", { cache: "no-store" }),
      ]);

      if (schedulesRes.ok) {
        const loadedSchedules = await schedulesRes.json();
        setSchedules(loadedSchedules);
        onSchedulesUpdate?.(loadedSchedules);
      }
      if (sectionsRes.ok) setSections(await sectionsRes.json());
      if (timeSlotsRes.ok) setTimeSlots(await timeSlotsRes.json());
      if (teachersRes.ok) setTeachers(await teachersRes.json());
      if (subjectsRes.ok) setSubjects(await subjectsRes.json());
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }, [onSchedulesUpdate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const allowedExtraSections = new Set(["PHYTAGORAS", "PDL"]);
  const fridayExtraSlot: TimeSlot = {
    id: "generated-friday-17-18",
    day: "Friday",
    startTime: "17:00",
    endTime: "18:00",
  };

  function normalizeSectionKey(section: { name: string; scheduleKey?: string | null; gradeLevel: string; track: string }) {
    const name = (section.scheduleKey || section.name || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const grade = (section.gradeLevel || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const track = (section.track || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return `${grade}:${track}:${name}`;
  }

  function normalizeSectionName(name: string) {
    return (name || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  // Get sections for selected grade
  const gradeSections = Array.from(
    new Map(
      sections
        .filter((s) => s.gradeLevel === selectedGrade)
        .map((section) => [normalizeSectionKey(section), section])
    ).values()
  );

  useEffect(() => {
    setSelectedSectionIndex(0);
  }, [selectedGrade]);

  const currentSection = gradeSections[selectedSectionIndex] || gradeSections[0];
  const displayedSections = currentSection ? [currentSection] : [];

  // Add Friday 5:00-6:00 only when PHYTAGORAS or PDL are present in Grade 11
  const effectiveTimeSlots = [...timeSlots];
  if (
    selectedGrade === "G11" &&
    gradeSections.some((section) => allowedExtraSections.has(normalizeSectionName(section.scheduleKey || section.name))) &&
    !effectiveTimeSlots.some((slot) => slot.day === "Friday" && slot.startTime === "17:00")
  ) {
    effectiveTimeSlots.push(fridayExtraSlot);
  }

  // Get unique days and sort them
  const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const uniqueDays = daysOrder.filter(day => 
    effectiveTimeSlots.some(ts => ts.day === day)
  );

  // Create unique row slots (time only) and sort once
  const rowTimeSlots = Array.from(
    new Map(effectiveTimeSlots.map((slot) => [`${slot.startTime}-${slot.endTime}`, slot])).values()
  ).sort((a, b) => {
    const timeA = Number(a.startTime.replace(":", ""));
    const timeB = Number(b.startTime.replace(":", ""));
    return timeA - timeB;
  });
  const fixedBreakStartTimes = new Set(["09:45", "12:00"]);

  // Get schedule for a specific slot and section
  function getScheduleForSlot(sectionId: string, timeSlotId: string): ScheduleBlock | undefined {
    return schedules.find(
      s => s.section.id === sectionId && s.timeSlot.id === timeSlotId
    );
  }

  function makeImagePrefill(rows: Record<string, string[]>) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    return Object.entries(rows).flatMap(([startTime, labels]) =>
      days.flatMap((day, dayIndex) => {
        const label = labels[dayIndex];
        if (!label) return [];

        const normalizedLabel = normalizeSubjectLabel(label);
        const style = normalizedLabel.includes("STAT") || normalizedLabel.includes("PRINCIPLESOFMKTG")
          ? { bg: "bg-amber-300", textColor: "text-black" }
          : normalizedLabel.includes("PAGBASA")
          ? { bg: "bg-cyan-500", textColor: "text-black" }
          : normalizedLabel.includes("HOPE") || normalizedLabel.includes("HRGP")
          ? { bg: "bg-violet-700", textColor: "text-white" }
          : normalizedLabel.includes("READING")
          ? { bg: "bg-rose-200", textColor: "text-black" }
          : normalizedLabel.includes("DRRR")
          ? { bg: "bg-blue-800", textColor: "text-white" }
          : normalizedLabel.includes("GENBIO")
          ? { bg: "bg-emerald-800", textColor: "text-white" }
          : normalizedLabel.includes("GENPHY")
          ? { bg: "bg-green-500", textColor: "text-black" }
          : normalizedLabel === "PR" || normalizedLabel === "PR1"
          ? { bg: "bg-red-600", textColor: "text-white" }
          : normalizedLabel.includes("UCSP")
          ? { bg: "bg-lime-400", textColor: "text-black" }
          : normalizedLabel.includes("EAPP")
          ? { bg: "bg-green-700", textColor: "text-white" }
          : normalizedLabel.includes("MIL")
          ? { bg: "bg-sky-100", textColor: "text-black" }
          : normalizedLabel.includes("PERDEV")
          ? { bg: "bg-yellow-300", textColor: "text-black" }
          : normalizedLabel === "PERD"
          ? { bg: "bg-yellow-300", textColor: "text-black" }
          : normalizedLabel.includes("IMMERSION")
          ? { bg: "bg-teal-800", textColor: "text-white" }
          : normalizedLabel.includes("TRENDS")
          ? { bg: "bg-cyan-500", textColor: "text-black" }
          : normalizedLabel.includes("CAREERADV")
          ? { bg: "bg-yellow-400", textColor: "text-black" }
          : normalizedLabel.includes("CENIZA")
          ? { bg: "bg-yellow-600", textColor: "text-black" }
          : normalizedLabel.includes("REYES")
          ? { bg: "bg-purple-600", textColor: "text-white" }
          : normalizedLabel.includes("3IS")
          ? { bg: "bg-red-800", textColor: "text-white" }
          : normalizedLabel.includes("FBS")
          ? { bg: "bg-blue-950", textColor: "text-white" }
          : normalizedLabel.includes("BESR")
          ? { bg: "bg-amber-900", textColor: "text-white" }
          : normalizedLabel.includes("EIM")
          ? { bg: "bg-slate-200", textColor: "text-black" }
          : normalizedLabel.includes("RESCAP")
          ? { bg: "bg-blue-600", textColor: "text-white" }
          : normalizedLabel.includes("NONOI")
          ? { bg: "bg-orange-300", textColor: "text-black" }
          : normalizedLabel.includes("CARAD")
          ? { bg: "bg-green-100", textColor: "text-black" }
          : normalizedLabel.includes("BSI")
          ? { bg: "bg-yellow-300", textColor: "text-black" }
          : normalizedLabel.includes("CALCULUS")
          ? { bg: "bg-white", textColor: "text-red-500" }
          : normalizedLabel.includes("PHYSCI")
          ? { bg: "bg-red-700", textColor: "text-white" }
          : normalizedLabel.includes("FABM")
          ? { bg: "bg-amber-100", textColor: "text-black" }
          : normalizedLabel.includes("DIAS")
          ? { bg: "bg-white", textColor: "text-black" }
          : { bg: "bg-amber-950", textColor: "text-white" };

        return [{ day, startTime, label, ...style }];
      })
    );
  }

  // Prefill mapping from pasted image for specific sections (visual-only overlay)
  const imagePrefill: Record<
    string,
    { day: string; startTime: string; label: string; bg?: string; textColor?: string; disableClick?: boolean }[]
  > = {
    // normalized section name -> entries
    PHYTAGORAS: [
      { day: "Friday", startTime: "07:45", label: "STAT", bg: "bg-pink-400", textColor: "text-white" },
      { day: "Friday", startTime: "08:45", label: "READING & WRTING", bg: "bg-rose-200", textColor: "text-black" },
      { day: "Friday", startTime: "10:00", label: "BNC", bg: "bg-teal-700", textColor: "text-white" },
      { day: "Friday", startTime: "11:00", label: "BNC", bg: "bg-teal-700", textColor: "text-white" },
      { day: "Friday", startTime: "13:00", label: "UCSP", bg: "bg-amber-700", textColor: "text-white" },
      { day: "Friday", startTime: "14:00", label: "PhySci", bg: "bg-lime-400", textColor: "text-black" },
      { day: "Friday", startTime: "15:00", label: "PAGBASA", bg: "bg-emerald-800", textColor: "text-white" },
      { day: "Friday", startTime: "16:00", label: "HOPE", bg: "bg-violet-700", textColor: "text-white" },
      { day: "Friday", startTime: "17:00", label: "PR1", bg: "bg-red-600", textColor: "text-white" },
    ],
    PDL: [
      { day: "Friday", startTime: "07:45", label: "UCSP", bg: "bg-amber-700", textColor: "text-white" },
      { day: "Friday", startTime: "08:45", label: "PR", bg: "bg-rose-200", textColor: "text-black" },
      { day: "Friday", startTime: "10:00", label: "PAGBASA", bg: "bg-emerald-800", textColor: "text-white" },
      { day: "Friday", startTime: "11:00", label: "READING & WRITING", bg: "bg-slate-200", textColor: "text-black" },
      { day: "Friday", startTime: "13:00", label: "STAT", bg: "bg-pink-400", textColor: "text-white" },
      { day: "Friday", startTime: "14:00", label: "HOUSEKEEPING", bg: "bg-cyan-400", textColor: "text-black" },
      { day: "Friday", startTime: "15:00", label: "HOUSEKEEPING", bg: "bg-cyan-400", textColor: "text-black" },
      { day: "Friday", startTime: "16:00", label: "PhySci", bg: "bg-lime-400", textColor: "text-black" },
      { day: "Friday", startTime: "17:00", label: "HOPE", bg: "bg-violet-700", textColor: "text-white" },
    ],
    DESCARTES: [
      { day: "Monday", startTime: "07:45", label: "UCSP", bg: "bg-slate-500", textColor: "text-white" },
      { day: "Tuesday", startTime: "07:45", label: "UCSP", bg: "bg-slate-500", textColor: "text-white" },
      { day: "Wednesday", startTime: "07:45", label: "UCSP", bg: "bg-slate-500", textColor: "text-white" },
      { day: "Thursday", startTime: "07:45", label: "UCSP", bg: "bg-slate-500", textColor: "text-white" },
      { day: "Friday", startTime: "07:45", label: "HRGP", bg: "bg-slate-500", textColor: "text-white" },
      { day: "Monday", startTime: "08:45", label: "READING & WRITING", bg: "bg-blue-600", textColor: "text-white" },
      { day: "Tuesday", startTime: "08:45", label: "READING & WRITING", bg: "bg-blue-600", textColor: "text-white" },
      { day: "Wednesday", startTime: "08:45", label: "READING & WRITING", bg: "bg-blue-600", textColor: "text-white" },
      { day: "Thursday", startTime: "08:45", label: "READING & WRITING", bg: "bg-blue-600", textColor: "text-white" },
      { day: "Friday", startTime: "08:45", label: "PR1", bg: "bg-red-600", textColor: "text-white" },
      { day: "Monday", startTime: "10:00", label: "EIM", bg: "bg-pink-500", textColor: "text-white" },
      { day: "Tuesday", startTime: "10:00", label: "HOPE", bg: "bg-violet-700", textColor: "text-white" },
      { day: "Wednesday", startTime: "10:00", label: "EIM", bg: "bg-pink-500", textColor: "text-white" },
      { day: "Thursday", startTime: "10:00", label: "EIM", bg: "bg-pink-500", textColor: "text-white" },
      { day: "Friday", startTime: "10:00", label: "EIM", bg: "bg-pink-500", textColor: "text-white" },
      { day: "Monday", startTime: "11:00", label: "EIM", bg: "bg-pink-500", textColor: "text-white" },
      { day: "Tuesday", startTime: "11:00", label: "PAGBASA", bg: "bg-emerald-800", textColor: "text-white" },
      { day: "Wednesday", startTime: "11:00", label: "EIM", bg: "bg-pink-500", textColor: "text-white" },
      { day: "Thursday", startTime: "11:00", label: "EIM", bg: "bg-pink-500", textColor: "text-white" },
      { day: "Friday", startTime: "11:00", label: "EIM", bg: "bg-pink-500", textColor: "text-white" },
      { day: "Monday", startTime: "13:00", label: "PhySci", bg: "bg-lime-400", textColor: "text-black" },
      { day: "Tuesday", startTime: "13:00", label: "PhySci", bg: "bg-lime-400", textColor: "text-black" },
      { day: "Wednesday", startTime: "13:00", label: "PhySci", bg: "bg-lime-400", textColor: "text-black" },
      { day: "Thursday", startTime: "13:00", label: "STAT", bg: "bg-pink-300", textColor: "text-black" },
      { day: "Friday", startTime: "13:00", label: "PhySci", bg: "bg-lime-400", textColor: "text-black" },
      { day: "Monday", startTime: "14:00", label: "PAGBASA", bg: "bg-emerald-800", textColor: "text-white" },
      { day: "Tuesday", startTime: "14:00", label: "STAT", bg: "bg-pink-300", textColor: "text-black" },
      { day: "Wednesday", startTime: "14:00", label: "PR1", bg: "bg-red-600", textColor: "text-white" },
      { day: "Thursday", startTime: "14:00", label: "PR1", bg: "bg-red-600", textColor: "text-white" },
      { day: "Friday", startTime: "14:00", label: "STAT", bg: "bg-pink-300", textColor: "text-black" },
      { day: "Monday", startTime: "15:00", label: "PAGBASA", bg: "bg-emerald-800", textColor: "text-white" },
      { day: "Tuesday", startTime: "15:00", label: "STAT", bg: "bg-pink-300", textColor: "text-black" },
      { day: "Wednesday", startTime: "15:00", label: "PAGBASA", bg: "bg-emerald-800", textColor: "text-white" },
      { day: "Thursday", startTime: "15:00", label: "PR1", bg: "bg-red-600", textColor: "text-white" },
      { day: "Friday", startTime: "15:00", label: "HOPE", bg: "bg-violet-700", textColor: "text-white" },
    ],
    DEWEY: [
      { day: "Monday", startTime: "07:45", label: "EIM", bg: "bg-pink-500", textColor: "text-white" },
      { day: "Tuesday", startTime: "07:45", label: "EIM", bg: "bg-pink-500", textColor: "text-white" },
      { day: "Wednesday", startTime: "07:45", label: "EIM", bg: "bg-pink-500", textColor: "text-white" },
      { day: "Thursday", startTime: "07:45", label: "EIM", bg: "bg-pink-500", textColor: "text-white" },
      { day: "Friday", startTime: "07:45", label: "HRGP", bg: "bg-slate-500", textColor: "text-white" },
      { day: "Monday", startTime: "08:45", label: "EIM", bg: "bg-pink-500", textColor: "text-white" },
      { day: "Tuesday", startTime: "08:45", label: "EIM", bg: "bg-pink-500", textColor: "text-white" },
      { day: "Wednesday", startTime: "08:45", label: "EIM", bg: "bg-pink-500", textColor: "text-white" },
      { day: "Thursday", startTime: "08:45", label: "EIM", bg: "bg-pink-500", textColor: "text-white" },
      { day: "Friday", startTime: "08:45", label: "PhySci", bg: "bg-lime-400", textColor: "text-black" },
      { day: "Monday", startTime: "10:00", label: "STAT", bg: "bg-amber-300", textColor: "text-black" },
      { day: "Tuesday", startTime: "10:00", label: "STAT", bg: "bg-amber-300", textColor: "text-black" },
      { day: "Wednesday", startTime: "10:00", label: "PR", bg: "bg-rose-200", textColor: "text-black" },
      { day: "Thursday", startTime: "10:00", label: "STAT", bg: "bg-amber-300", textColor: "text-black" },
      { day: "Friday", startTime: "10:00", label: "STAT", bg: "bg-amber-300", textColor: "text-black" },
      { day: "Monday", startTime: "11:00", label: "PhySci", bg: "bg-lime-400", textColor: "text-black" },
      { day: "Tuesday", startTime: "11:00", label: "PR", bg: "bg-rose-200", textColor: "text-black" },
      { day: "Wednesday", startTime: "11:00", label: "HOPE", bg: "bg-violet-700", textColor: "text-white" },
      { day: "Thursday", startTime: "11:00", label: "PR", bg: "bg-rose-200", textColor: "text-black" },
      { day: "Friday", startTime: "11:00", label: "PR", bg: "bg-rose-200", textColor: "text-black" },
      { day: "Monday", startTime: "13:00", label: "PAGBASA", bg: "bg-emerald-800", textColor: "text-white" },
      { day: "Tuesday", startTime: "13:00", label: "PAGBASA", bg: "bg-emerald-800", textColor: "text-white" },
      { day: "Wednesday", startTime: "13:00", label: "READING & WRITING", bg: "bg-blue-600", textColor: "text-white" },
      { day: "Thursday", startTime: "13:00", label: "PAGBASA", bg: "bg-emerald-800", textColor: "text-white" },
      { day: "Friday", startTime: "13:00", label: "PAGBASA", bg: "bg-emerald-800", textColor: "text-white" },
      { day: "Monday", startTime: "14:00", label: "READING & WRITING", bg: "bg-blue-600", textColor: "text-white" },
      { day: "Tuesday", startTime: "14:00", label: "PhySci", bg: "bg-lime-400", textColor: "text-black" },
      { day: "Wednesday", startTime: "14:00", label: "READING & WRITING", bg: "bg-blue-600", textColor: "text-white" },
      { day: "Thursday", startTime: "14:00", label: "UCSP", bg: "bg-amber-700", textColor: "text-white" },
      { day: "Friday", startTime: "14:00", label: "READING & WRITING", bg: "bg-blue-600", textColor: "text-white" },
      { day: "Monday", startTime: "15:00", label: "UCSP", bg: "bg-amber-700", textColor: "text-white" },
      { day: "Tuesday", startTime: "15:00", label: "PhySci", bg: "bg-lime-400", textColor: "text-black" },
      { day: "Wednesday", startTime: "15:00", label: "UCSP", bg: "bg-amber-700", textColor: "text-white" },
      { day: "Thursday", startTime: "15:00", label: "UCSP", bg: "bg-amber-700", textColor: "text-white" },
    ],
    KANT: [
      { day: "Monday", startTime: "07:45", label: "PAGBASA", bg: "bg-amber-900", textColor: "text-white" },
      { day: "Tuesday", startTime: "07:45", label: "PAGBASA", bg: "bg-amber-900", textColor: "text-white" },
      { day: "Wednesday", startTime: "07:45", label: "PAGBASA", bg: "bg-amber-900", textColor: "text-white" },
      { day: "Thursday", startTime: "07:45", label: "PAGBASA", bg: "bg-amber-900", textColor: "text-white" },
      { day: "Friday", startTime: "07:45", label: "HRGP", bg: "bg-slate-500", textColor: "text-white" },
      { day: "Monday", startTime: "08:45", label: "PR", bg: "bg-rose-200", textColor: "text-black" },
      { day: "Tuesday", startTime: "08:45", label: "PR", bg: "bg-rose-200", textColor: "text-black" },
      { day: "Wednesday", startTime: "08:45", label: "PR", bg: "bg-rose-200", textColor: "text-black" },
      { day: "Thursday", startTime: "08:45", label: "PR", bg: "bg-rose-200", textColor: "text-black" },
      { day: "Friday", startTime: "08:45", label: "PHYSCI", bg: "bg-lime-400", textColor: "text-black" },
      { day: "Monday", startTime: "10:00", label: "BNC", bg: "bg-rose-100", textColor: "text-black" },
      { day: "Tuesday", startTime: "10:00", label: "BNC", bg: "bg-rose-100", textColor: "text-black" },
      { day: "Wednesday", startTime: "10:00", label: "HOPE", bg: "bg-violet-700", textColor: "text-white" },
      { day: "Thursday", startTime: "10:00", label: "BNC", bg: "bg-rose-100", textColor: "text-black" },
      { day: "Friday", startTime: "10:00", label: "BNC", bg: "bg-rose-100", textColor: "text-black" },
      { day: "Monday", startTime: "11:00", label: "BNC", bg: "bg-rose-100", textColor: "text-black" },
      { day: "Tuesday", startTime: "11:00", label: "BNC", bg: "bg-rose-100", textColor: "text-black" },
      { day: "Wednesday", startTime: "11:00", label: "PHYSCI", bg: "bg-lime-400", textColor: "text-black" },
      { day: "Thursday", startTime: "11:00", label: "BNC", bg: "bg-rose-100", textColor: "text-black" },
      { day: "Friday", startTime: "11:00", label: "BNC", bg: "bg-rose-100", textColor: "text-black" },
      { day: "Monday", startTime: "13:00", label: "STAT", bg: "bg-amber-300", textColor: "text-black" },
      { day: "Tuesday", startTime: "13:00", label: "STAT", bg: "bg-amber-300", textColor: "text-black" },
      { day: "Wednesday", startTime: "13:00", label: "STAT", bg: "bg-amber-300", textColor: "text-black" },
      { day: "Thursday", startTime: "13:00", label: "PHYSCI", bg: "bg-lime-400", textColor: "text-black" },
      { day: "Friday", startTime: "13:00", label: "STAT", bg: "bg-amber-300", textColor: "text-black" },
      { day: "Monday", startTime: "14:00", label: "UCSP", bg: "bg-amber-700", textColor: "text-white" },
      { day: "Tuesday", startTime: "14:00", label: "UCSP", bg: "bg-amber-700", textColor: "text-white" },
      { day: "Wednesday", startTime: "14:00", label: "UCSP", bg: "bg-amber-700", textColor: "text-white" },
      { day: "Thursday", startTime: "14:00", label: "PHYSCI", bg: "bg-lime-400", textColor: "text-black" },
      { day: "Friday", startTime: "14:00", label: "UCSP", bg: "bg-amber-700", textColor: "text-white" },
      { day: "Monday", startTime: "15:00", label: "READING & WRITING", bg: "bg-rose-200", textColor: "text-black" },
      { day: "Tuesday", startTime: "15:00", label: "READING & WRITING", bg: "bg-rose-200", textColor: "text-black" },
      { day: "Wednesday", startTime: "15:00", label: "READING & WRITING", bg: "bg-rose-200", textColor: "text-black" },
      { day: "Thursday", startTime: "15:00", label: "READING & WRITING", bg: "bg-rose-200", textColor: "text-black" },
    ],
    ERICKSON: [
      { day: "Monday", startTime: "07:45", label: "PR", bg: "bg-rose-200", textColor: "text-black" },
      { day: "Monday", startTime: "08:45", label: "STAT", bg: "bg-amber-300", textColor: "text-black" },
      { day: "Monday", startTime: "10:00", label: "HOPE", bg: "bg-violet-700", textColor: "text-white" },
      { day: "Monday", startTime: "11:00", label: "UCSP", bg: "bg-amber-700", textColor: "text-white" },
      { day: "Monday", startTime: "13:00", label: "READING & WRITING", bg: "bg-blue-600", textColor: "text-white" },
      { day: "Monday", startTime: "14:00", label: "BNC", bg: "bg-teal-700", textColor: "text-white" },
      { day: "Monday", startTime: "15:00", label: "BNC", bg: "bg-teal-700", textColor: "text-white" },
      { day: "Tuesday", startTime: "07:45", label: "PR", bg: "bg-rose-200", textColor: "text-black" },
      { day: "Tuesday", startTime: "08:45", label: "STAT", bg: "bg-amber-300", textColor: "text-black" },
      { day: "Tuesday", startTime: "10:00", label: "PAGBASA", bg: "bg-emerald-800", textColor: "text-white" },
      { day: "Tuesday", startTime: "11:00", label: "UCSP", bg: "bg-amber-700", textColor: "text-white" },
      { day: "Tuesday", startTime: "13:00", label: "READING & WRITING", bg: "bg-blue-600", textColor: "text-white" },
      { day: "Tuesday", startTime: "14:00", label: "BNC", bg: "bg-teal-700", textColor: "text-white" },
      { day: "Tuesday", startTime: "15:00", label: "BNC", bg: "bg-teal-700", textColor: "text-white" },
      { day: "Wednesday", startTime: "07:45", label: "PR", bg: "bg-rose-200", textColor: "text-black" },
      { day: "Wednesday", startTime: "08:45", label: "STAT", bg: "bg-amber-300", textColor: "text-black" },
      { day: "Wednesday", startTime: "10:00", label: "PhySci", bg: "bg-lime-400", textColor: "text-black" },
      { day: "Wednesday", startTime: "11:00", label: "UCSP", bg: "bg-amber-700", textColor: "text-white" },
      { day: "Wednesday", startTime: "13:00", label: "READING & WRITING", bg: "bg-blue-600", textColor: "text-white" },
      { day: "Wednesday", startTime: "14:00", label: "BNC", bg: "bg-teal-700", textColor: "text-white" },
      { day: "Wednesday", startTime: "15:00", label: "BNC", bg: "bg-teal-700", textColor: "text-white" },
      { day: "Thursday", startTime: "07:45", label: "PR", bg: "bg-rose-200", textColor: "text-black" },
      { day: "Thursday", startTime: "08:45", label: "PAGBASA", bg: "bg-emerald-800", textColor: "text-white" },
      { day: "Thursday", startTime: "10:00", label: "PhySci", bg: "bg-lime-400", textColor: "text-black" },
      { day: "Thursday", startTime: "11:00", label: "UCSP", bg: "bg-amber-700", textColor: "text-white" },
      { day: "Thursday", startTime: "13:00", label: "READING & WRITING", bg: "bg-blue-600", textColor: "text-white" },
      { day: "Thursday", startTime: "14:00", label: "BNC", bg: "bg-teal-700", textColor: "text-white" },
      { day: "Thursday", startTime: "15:00", label: "BNC", bg: "bg-teal-700", textColor: "text-white" },
      { day: "Friday", startTime: "07:45", label: "HRGP", bg: "bg-slate-500", textColor: "text-white" },
      { day: "Friday", startTime: "08:45", label: "STAT", bg: "bg-amber-300", textColor: "text-black" },
      { day: "Friday", startTime: "10:00", label: "PhySci", bg: "bg-lime-400", textColor: "text-black" },
      { day: "Friday", startTime: "11:00", label: "PhySci", bg: "bg-lime-400", textColor: "text-black" },
      { day: "Friday", startTime: "13:00", label: "PAGBASA", bg: "bg-emerald-800", textColor: "text-white" },
      { day: "Friday", startTime: "14:00", label: "PAGBASA", bg: "bg-emerald-800", textColor: "text-white" },
    ],
    SOCRATES: [
      { day: "Monday", startTime: "07:45", label: "DRRR", bg: "bg-slate-700", textColor: "text-white" },
      { day: "Tuesday", startTime: "07:45", label: "DRRR", bg: "bg-slate-700", textColor: "text-white" },
      { day: "Wednesday", startTime: "07:45", label: "DRRR", bg: "bg-slate-700", textColor: "text-white" },
      { day: "Thursday", startTime: "07:45", label: "DRRR", bg: "bg-slate-700", textColor: "text-white" },
      { day: "Friday", startTime: "07:45", label: "HRGP", bg: "bg-slate-700", textColor: "text-white" },

      { day: "Monday", startTime: "08:45", label: "HOPE", bg: "bg-violet-700", textColor: "text-white" },
      { day: "Tuesday", startTime: "08:45", label: "UCSP", bg: "bg-amber-700", textColor: "text-white" },
      { day: "Wednesday", startTime: "08:45", label: "UCSP", bg: "bg-amber-700", textColor: "text-white" },
      { day: "Thursday", startTime: "08:45", label: "UCSP", bg: "bg-amber-700", textColor: "text-white" },
      { day: "Friday", startTime: "08:45", label: "UCSP", bg: "bg-amber-700", textColor: "text-white" },

      { day: "Monday", startTime: "10:00", label: "General Biology 2", bg: "bg-emerald-900", textColor: "text-white" },
      { day: "Tuesday", startTime: "10:00", label: "Basic Calculus", bg: "bg-white", textColor: "text-red-500" },
      { day: "Wednesday", startTime: "10:00", label: "Basic Calculus", bg: "bg-white", textColor: "text-red-500" },
      { day: "Thursday", startTime: "10:00", label: "Basic Calculus", bg: "bg-white", textColor: "text-red-500" },
      { day: "Friday", startTime: "10:00", label: "Basic Calculus", bg: "bg-white", textColor: "text-red-500" },

      { day: "Monday", startTime: "11:00", label: "Reading and Writing", bg: "bg-rose-700", textColor: "text-white" },
      { day: "Tuesday", startTime: "11:00", label: "Reading and Writing", bg: "bg-rose-700", textColor: "text-white" },
      { day: "Wednesday", startTime: "11:00", label: "General Biology 2", bg: "bg-emerald-900", textColor: "text-white" },
      { day: "Thursday", startTime: "11:00", label: "Reading and Writing", bg: "bg-rose-700", textColor: "text-white" },
      { day: "Friday", startTime: "11:00", label: "Reading and Writing", bg: "bg-rose-700", textColor: "text-white" },

      { day: "Monday", startTime: "13:00", label: "STAT", bg: "bg-pink-400", textColor: "text-white" },
      { day: "Tuesday", startTime: "13:00", label: "STAT", bg: "bg-pink-400", textColor: "text-white" },
      { day: "Wednesday", startTime: "13:00", label: "STAT", bg: "bg-pink-400", textColor: "text-white" },
      { day: "Thursday", startTime: "13:00", label: "STAT", bg: "bg-pink-400", textColor: "text-white" },
      { day: "Friday", startTime: "13:00", label: "General Biology 2", bg: "bg-emerald-900", textColor: "text-white" },

      { day: "Monday", startTime: "14:00", label: "PAGBASA", bg: "bg-emerald-800", textColor: "text-white" },
      { day: "Tuesday", startTime: "14:00", label: "PAGBASA", bg: "bg-emerald-800", textColor: "text-white" },
      { day: "Wednesday", startTime: "14:00", label: "PAGBASA", bg: "bg-emerald-800", textColor: "text-white" },
      { day: "Thursday", startTime: "14:00", label: "PAGBASA", bg: "bg-emerald-800", textColor: "text-white" },
      { day: "Friday", startTime: "14:00", label: "General Biology 2", bg: "bg-emerald-900", textColor: "text-white" },

      { day: "Monday", startTime: "15:00", label: "PR1", bg: "bg-red-600", textColor: "text-white" },
      { day: "Tuesday", startTime: "15:00", label: "PR1", bg: "bg-red-600", textColor: "text-white" },
      { day: "Wednesday", startTime: "15:00", label: "PR1", bg: "bg-red-600", textColor: "text-white" },
      { day: "Thursday", startTime: "15:00", label: "PR1", bg: "bg-red-600", textColor: "text-white" },
    ],
    LAOTZU: makeImagePrefill({
      "07:45": ["STAT", "STAT", "STAT", "STAT", "HRGP"],
      "08:45": ["PAGBASA", "HOPE", "PAGBASA", "PAGBASA", "PAGBASA"],
      "10:00": ["READING & WRITING", "GEN BIO", "GEN BIO", "GEN BIO", "GEN BIO"],
      "11:00": ["DRRR", "DRRR", "READING & WRITING", "DRRR", "DRRR"],
      "13:00": ["PR1", "PR1", "PR1", "PR1", "READING & WRITING"],
      "14:00": ["CALCULUS", "CALCULUS", "CALCULUS", "CALCULUS", "READING & WRITING"],
      "15:00": ["UCSP", "UCSP", "UCSP", "UCSP", ""],
    }),
    LOCKE: makeImagePrefill({
      "07:45": ["STAT", "STAT", "STAT", "STAT", "HRGP"],
      "08:45": ["PR1", "PR1", "HOPE", "PR1", "PR1"],
      "10:00": ["PHYSCI", "READING & WRITING", "READING & WRITING", "READING & WRITING", "READING & WRITING"],
      "11:00": ["PAGBASA", "PHYSCI", "PAGBASA", "PAGBASA", "PAGBASA"],
      "13:00": ["CREATIVE WRITING", "CREATIVE WRITING", "CREATIVE WRITING", "CREATIVE WRITING", "UCSP"],
      "14:00": ["DRRR", "DRRR", "DRRR", "DRRR", "PHYSCI"],
      "15:00": ["UCSP", "UCSP", "UCSP", "", "PHYSCI"],
    }),
    VOLTAIRE: makeImagePrefill({
      "07:45": ["PAGBASA", "PAGBASA", "PAGBASA", "PAGBASA", "HRGP"],
      "08:45": ["READING & WRITING", "READING & WRITING", "READING & WRITING", "READING & WRITING", "HOPE"],
      "10:00": ["STAT", "PHYSCI", "PHYSCI", "PHYSCI", "PHYSCI"],
      "11:00": ["STAT", "UCSP", "UCSP", "UCSP", "UCSP"],
      "13:00": ["PR1", "PR1", "PR1", "STAT", "PR1"],
      "14:00": ["CREATIVE WRITING", "CREATIVE WRITING", "CREATIVE WRITING", "CREATIVE WRITING", "STAT"],
      "15:00": ["DRRR", "DRRR", "DRRR", "", "DRRR"],
    }),
    DEMOCRITUS: makeImagePrefill({
      "07:45": ["CREATIVE WRITING", "CREATIVE WRITING", "CREATIVE WRITING", "CREATIVE WRITING", "HRGP"],
      "08:45": ["PHYSCI", "PHYSCI", "PHYSCI", "HOPE", "PHYSCI"],
      "10:00": ["STAT", "UCSP", "UCSP", "UCSP", "UCSP"],
      "11:00": ["STAT", "PAGBASA", "PAGBASA", "PAGBASA", "PAGBASA"],
      "13:00": ["DIAS", "DIAS", "DIAS", "STAT", "DIAS"],
      "14:00": ["READING & WRITING", "READING & WRITING", "READING & WRITING", "READING & WRITING", "PR"],
      "15:00": ["PR", "PR", "PR", "", "STAT"],
    }),
    HUME: makeImagePrefill({
      "07:45": ["UCSP", "UCSP", "UCSP", "UCSP", "HRGP"],
      "08:45": ["STAT", "STAT", "STAT", "DIAS", "STAT"],
      "10:00": ["DIAS", "PHYSCI", "PHYSCI", "PHYSCI", "PHYSCI"],
      "11:00": ["DIAS", "PR1", "PR1", "PR1", "PR1"],
      "13:00": ["HOPE", "CREATIVE WRITING", "CREATIVE WRITING", "CREATIVE WRITING", "CREATIVE WRITING"],
      "14:00": ["READING", "READING", "READING", "READING", "PAGBASA"],
      "15:00": ["PAGBASA", "PAGBASA", "PAGBASA", "", "DIAS"],
    }),
    PLATO: makeImagePrefill({
      "07:45": ["PAGBASA", "PAGBASA", "PAGBASA", "PAGBASA", "HRGP"],
      "08:45": ["DIAS", "DIAS", "DIAS", "DIAS", "PHYSCI"],
      "10:00": ["PHYSCI", "CREATIVE WRITING", "CREATIVE WRITING", "CREATIVE WRITING", "CREATIVE WRITING"],
      "11:00": ["PHYSCI", "STAT", "STAT", "STAT", "STAT"],
      "13:00": ["READING", "HOPE", "READING", "READING", "READING"],
      "14:00": ["UCSP", "UCSP", "UCSP", "PR1", "UCSP"],
      "15:00": ["PR1", "PR1", "PR1", "", "PHYSCI"],
    }),
    CONFUCIUS: makeImagePrefill({
      "07:45": ["PR1", "PR1", "PR1", "PR1", "HRGP"],
      "08:45": ["STAT", "STAT", "STAT", "STAT", "CREATIVE WRITING"],
      "10:00": ["PHYSCI", "READING & WRITING", "READING & WRITING", "READING & WRITING", "READING & WRITING"],
      "11:00": ["PHYSCI", "DIAS", "DIAS", "DIAS", "DIAS"],
      "13:00": ["PAGBASA", "PAGBASA", "HOPE", "PAGBASA", "PAGBASA"],
      "14:00": ["UCSP", "UCSP", "UCSP", "PHYSCI", "UCSP"],
      "15:00": ["CREATIVE WRITING", "CREATIVE WRITING", "CREATIVE WRITING", "", "PHYSCI"],
    }),
    AURELIUS: makeImagePrefill({
      "07:45": ["PAGBASA", "PAGBASA", "PAGBASA", "PAGBASA", "HRGP"],
      "08:45": ["READING & WRITING", "READING & WRITING", "READING & WRITING", "CREATIVE WRITING", "READING & WRITING"],
      "10:00": ["CREATIVE WRITING", "DIAS", "DIAS", "DIAS", "DIAS"],
      "11:00": ["CREATIVE WRITING", "PHYSCI", "PHYSCI", "PHYSCI", "PHYSCI"],
      "13:00": ["STAT", "STAT", "STAT", "HOPE", "STAT"],
      "14:00": ["PR1", "PR1", "PR1", "PR1", "UCSP"],
      "15:00": ["UCSP", "UCSP", "UCSP", "", "CREATIVE WRITING"],
    }),
    ARISTOTLE: makeImagePrefill({
      "07:45": ["PRINCIPLES OF MKTG", "PRINCIPLES OF MKTG", "PRINCIPLES OF MKTG", "PRINCIPLES OF MKTG", "HRGP"],
      "08:45": ["PAGBASA", "PAGBASA", "PAGBASA", "PR1", "PAGBASA"],
      "10:00": ["PR1", "READING & WRITING", "READING & WRITING", "READING & WRITING", "READING & WRITING"],
      "11:00": ["PR1", "STAT", "STAT", "STAT", "STAT"],
      "13:00": ["UCSP", "UCSP", "UCSP", "UCSP", "HOPE"],
      "14:00": ["FABM1", "FABM1", "FABM1", "FABM1", "PHYSCI"],
      "15:00": ["PHYSCI", "PHYSCI", "PHYSCI", "", "PR1"],
    }),
    GRATITUDE: makeImagePrefill({
      "07:45": ["", "", "", "", "FBS"],
      "08:45": ["", "", "", "", "FBS"],
      "10:00": ["", "", "", "", "PERDEV"],
      "11:00": ["", "", "", "", "MIL"],
      "13:00": ["", "", "", "", "IMMERSION"],
      "14:00": ["", "", "", "", "EAPP"],
      "15:00": ["", "", "", "", "3Is"],
      "16:00": ["", "", "", "", "HOPE"],
    }),
    SIMPLICITY: makeImagePrefill({
      "07:45": ["EIM", "EIM", "EIM", "HRGP", "EIM"],
      "08:45": ["EIM", "EIM", "EIM", "HOPE", "EIM"],
      "10:00": ["EAPP", "EAPP", "3Is", "EAPP", "EAPP"],
      "11:00": ["3Is", "3Is", "MIL", "MIL", "3Is"],
      "13:00": ["PERDEV", "PERDEV", "PERDEV", "PERDEV", "MIL"],
      "14:00": ["IMMERSION", "IMMERSION", "IMMERSION", "IMMERSION", "MIL"],
    }),
    HONESTY: makeImagePrefill({
      "07:45": ["IMMERSION", "IMMERSION", "IMMERSION", "IMMERSION", "HRGP"],
      "08:45": ["PERDEV", "PERDEV", "PERDEV", "PERDEV", "EAPP"],
      "10:00": ["FBS", "EAPP", "FBS", "FBS", "FBS"],
      "11:00": ["FBS", "HOPE", "FBS", "FBS", "FBS"],
      "13:00": ["MIL", "MIL", "MIL", "EAPP", "3Is"],
      "14:00": ["3Is", "3Is", "MIL", "EAPP", "3Is"],
    }),
    HOPE: makeImagePrefill({
      "07:45": ["PERDEV", "PERDEV", "PERDEV", "PERDEV", "HRGP"],
      "08:45": ["IMMERSION", "IMMERSION", "HOPE", "IMMERSION", "IMMERSION"],
      "10:00": ["EAPP", "MIL", "EAPP", "EAPP", "EAPP"],
      "11:00": ["3Is", "MIL", "3Is", "3Is", "3Is"],
      "13:00": ["FBS", "FBS", "FBS", "MIL", "FBS"],
      "14:00": ["FBS", "FBS", "FBS", "MIL", "FBS"],
    }),
    TRIUMPH: makeImagePrefill({
      "07:45": ["3Is", "3Is", "3Is", "3Is", "HRGP"],
      "08:45": ["PERDEV", "RES.CAP", "RES.CAP", "RES.CAP", "RES.CAP"],
      "10:00": ["GEN.Phy", "GEN.Phy", "PERDEV", "GEN.Phy", "GEN.Phy"],
      "11:00": ["MIL", "MIL", "PERDEV", "MIL", "MIL"],
      "13:00": ["EAPP", "EAPP", "EAPP", "PERDEV", "EAPP"],
      "14:00": ["HOPE", "", "", "", ""],
    }),
    WISDOM: makeImagePrefill({
      "07:45": ["RES.CAP", "RES.CAP", "RES.CAP", "RES.CAP", "HRGP"],
      "08:45": ["GEN.Phy", "GEN.Phy", "GEN.Phy", "GEN.Phy", "MIL"],
      "10:00": ["EAPP", "EAPP", "MIL", "EAPP", "EAPP"],
      "11:00": ["PERDEV", "PERDEV", "MIL", "PERDEV", "PERDEV"],
      "13:00": ["HOPE", "3Is", "3Is", "3Is", "3Is"],
      "14:00": ["MIL", "", "", "", ""],
    }),
    HUMILITY: makeImagePrefill({
      "07:45": ["EAPP", "EAPP", "EAPP", "EAPP", "HRGP"],
      "08:45": ["DRRR", "DRRR", "DRRR", "MIL", "DRRR"],
      "10:00": ["MIL", "PERDEV", "PERDEV", "PERDEV", "PERDEV"],
      "11:00": ["FABM 2", "3Is", "FABM 2", "FABM 2", "FABM 2"],
      "13:00": ["CAREER ADV", "CAREER ADV", "HOPE", "CAREER ADV", "CAREER ADV"],
      "14:00": ["INTRO TO WORLD", "INTRO TO WORLD", "INTRO TO WORLD", "INTRO TO WORLD", "MIL"],
      "15:00": ["3Is", "", "3Is", "3Is", "MIL"],
    }),
    FAITH: makeImagePrefill({
      "07:45": ["CAREER ADV", "CAREER ADV", "CAREER ADV", "CAREER ADV", "HRGP"],
      "08:45": ["EAPP", "EAPP", "EAPP", "DRRR", "EAPP"],
      "10:00": ["INTRO TO WORLD", "INTRO TO WORLD", "DRRR", "INTRO TO WORLD", "INTRO TO WORLD"],
      "11:00": ["PERDEV", "PERDEV", "DRRR", "PERDEV", "PERDEV"],
      "13:00": ["FABM 2", "FABM 2", "FABM 2", "FABM 2", "HOPE"],
      "14:00": ["3Is", "3Is", "MIL", "3Is", "3Is"],
      "15:00": ["MIL", "", "MIL", "MIL", "DRRR"],
    }),
    LOVE: makeImagePrefill({
      "07:45": ["TRENDS", "TRENDS", "TRENDS", "TRENDS", "HRGP"],
      "08:45": ["CAREER ADV", "CAREER ADV", "3Is", "3Is", "CAREER ADV"],
      "10:00": ["3Is", "PERDEV", "PERDEV", "PERDEV", "PERDEV"],
      "11:00": ["EAPP", "EAPP", "3Is", "EAPP", "EAPP"],
      "13:00": ["3Is", "MIL", "MIL", "MIL", "MIL"],
      "14:00": ["", "HOPE", "", "", ""],
    }),
    CHARITY: makeImagePrefill({
      "07:45": ["EAPP", "EAPP", "EAPP", "EAPP", "HRGP"],
      "08:45": ["3Is", "3Is", "3Is", "TRENDS", "HOPE"],
      "10:00": ["MIL", "MIL", "TRENDS", "MIL", "MIL"],
      "11:00": ["PERDEV", "PERDEV", "TRENDS", "PERDEV", "PERDEV"],
      "13:00": ["TRENDS", "CAREER ADV", "CAREER ADV", "CAREER ADV", "CAREER ADV"],
      "14:00": ["", "", "", "3Is", ""],
    }),
    DILIGENCE: makeImagePrefill({
      "07:45": ["MIL", "MIL", "MIL", "MIL", "HRGP"],
      "08:45": ["TRENDS", "TRENDS", "TRENDS", "EAPP", "TRENDS"],
      "10:00": ["PERDEV", "PERDEV", "PERDEV", "HOPE", "PERDEV"],
      "11:00": ["CAREER ADV", "EAPP", "CAREER ADV", "CAREER ADV", "CAREER ADV"],
      "13:00": ["EAPP", "3Is", "3Is", "3Is", "3Is"],
      "14:00": ["EAPP", "", "", "", ""],
    }),
    PERSEVERANCE: makeImagePrefill({
      "07:45": ["PERDEV", "PERDEV", "PERDEV", "PERDEV", "HRGP"],
      "08:45": ["MIL", "MIL", "MIL", "MIL", "CAREER ADV"],
      "10:00": ["EAPP", "EAPP", "HOPE", "EAPP", "EAPP"],
      "11:00": ["3Is", "3Is", "CAREER ADV", "3Is", "3Is"],
      "13:00": ["CAREER ADV", "TRENDS", "TRENDS", "TRENDS", "TRENDS"],
      "14:00": ["CAREER ADV", "", "", "", ""],
    }),
    GENEROSITY: makeImagePrefill({
      "07:45": ["EAPP", "EAPP", "EAPP", "EAPP", "HRGP"],
      "08:45": ["PERDEV", "PERDEV", "PERDEV", "3Is", "PERDEV"],
      "10:00": ["CAREER ADV", "HOPE", "CAREER ADV", "CAREER ADV", "CAREER ADV"],
      "11:00": ["MIL", "MIL", "3Is", "MIL", "MIL"],
      "13:00": ["3Is", "TRENDS", "TRENDS", "TRENDS", "TRENDS"],
      "14:00": ["3Is", "", "", "", ""],
    }),
    PATIENCE: makeImagePrefill({
      "07:45": ["PERDEV", "PERDEV", "PERDEV", "PERDEV", "HRGP"],
      "08:45": ["BSI", "BSI", "BSI", "BSI", "BESR"],
      "10:00": ["BESR", "BESR", "MIL", "MIL", "MIL"],
      "11:00": ["EAPP", "EAPP", "HOPE", "EAPP", "EAPP"],
      "13:00": ["MIL", "3Is", "3Is", "3Is", "3Is"],
      "14:00": ["", "", "BESR", "", ""],
    }),
  };

  // Sections that should render assigned schedule blocks with neutral/default appearance
  const neutralSections = new Set(["ERICKSON"]);

  function isNeutralSection(sectionName: string) {
    const key = (sectionName || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return Array.from(neutralSections).some((s) => key.includes(s) || s.includes(key));
  }

  function getImagePrefill(sectionKey: string, day: string, startTime: string) {
    const fixedBreaks: Record<string, { label: string; bg: string; textColor: string; disableClick: boolean }> = {
      "09:45": { label: "RECESS", bg: "bg-rose-300", textColor: "text-black", disableClick: true },
      "12:00": { label: "LUNCH BREAK", bg: "bg-rose-300", textColor: "text-black", disableClick: true },
    };

    if (fixedBreaks[startTime]) {
      return { day, startTime, ...fixedBreaks[startTime] };
    }

    const key = (sectionKey || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const foundKey = Object.keys(imagePrefill).find((k) => key.includes(k) || k.includes(key));
    if (!foundKey) return null;
    const entries = imagePrefill[foundKey];
    return entries.find((e) => e.day === day && e.startTime === startTime) || null;
  }

  function normalizeSubjectLabel(label: string) {
    return (label || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function findSubjectIdForPrefill(label: string, gradeLevel?: string) {
    if (!label) return "";

    const normalizedLabel = normalizeSubjectLabel(label);
    const legacySubjectKeyMap: Record<string, string> = {
      HRGP: "HOMEROOMGUIDANCEPROGRAM",
      PR: "PRACTICALRESEARCH1",
      PR1: "PRACTICALRESEARCH1",
      STAT: "STATISTICSANDPROBABILITY",
      HOPE: gradeLevel === "G12"
        ? "HEALTHOPTIMIZATIONPROGRAMFOREDUCATION4"
        : "HEALTHOPTIMIZATIONPROGRAMFOREDUCATION3",
      READINGWRITING: "READINGANDWRITINGSKILLS",
      READINGANDWRITING: "READINGANDWRITINGSKILLS",
      PHYSCI: "PHYSICALSCIENCE",
      EIM: "ELECTRICALINSTALLATIONANDMAINTENANCE",
      UCSP: "UNDERSTANDINGCULTURESOCIETYANDPOLITICS",
      PAGBASA: "PAGBASAATPAGSUSURINGIBAIBANGTEKSTOTUNGOSAPANANALIKSIK",
    };
    const subjectKey = legacySubjectKeyMap[normalizedLabel] || normalizedLabel;
    const keyMatch = subjects.find(
      (subject) =>
        normalizeSubjectLabel(subject.scheduleKey || "") === subjectKey &&
        (!gradeLevel || subject.gradeLevel === gradeLevel)
    );
    if (keyMatch) return keyMatch.id;
    const exactMatch = subjects.find(
      (subject) => normalizeSubjectLabel(subject.name) === normalizedLabel
    );
    if (exactMatch) return exactMatch.id;

    const aliasMap: Record<string, string> = {
      UCSP: "Understanding Culture, Society, and Politics",
      PR: "Practical Research 1",
      PR1: "Practical Research 1",
      READINGWRITING: "Reading and Writing Skills",
      READINGSWRITING: "Reading and Writing Skills",
      READINGANDWRITING: "Reading and Writing Skills",
      READING: "Reading and Writing Skills",
      STAT: "Statistics and Probability",
      PHYSCI: "Physical Science",
      EIM: "Electrical Installation and Maintenance",
      HOPF: "Health Optimization Program for Education 3",
      HOPEF: "Health Optimization Program for Education 3",
      BNC: "Beauty Nail and Culture",
      HOUSEKEEPING: "Housekeeping",
      PAGBASAAMORO: "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik",
      PAGBASA: "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik",
      FAM: "Fundamentals of Accountancy, Business, and Management 1",
      FABM1: "Fundamentals of Accountancy, Business, and Management 1",
      FABM2: "Fundamentals of Accountancy, Business, and Management 2",
      PM: "Principles of Marketing",
      PRINCIPLESOFMKTG: "Principles of Marketing",
      BESR: "Business Ethics and Social Responsibility",
      CW: "Creative Writing",
      DRRR: "Disaster Readiness and Risk Reduction",
      DIAS: "Disciplines and Ideas in the Applied Social Sciences",
      INTROTOWORLD: "Introduction to World Religions and Belief Systems",
      FBS: "Food and Beverage Services",
      PERDEV: "Personal Development",
      MIL: "Media and Information Literacy",
      IMMERSION: "Work Immersion",
      EAPP: "English for Academic and Professional Purposes",
      "3IS": "Inquiries, Investigations, and Immersion",
      GENPHY: "General Physics 2",
      RESCAP: "Research Capstone",
      CAREERADV: "Career Advocacy",
      TRENDS: "Trends, Networks, and Critical Thinking in the 21st Century",
      BSI: "Business Simulation",
      CALCULUS: "Basic Calculus",
      BASICCALCULUS: "Basic Calculus",
      CALC: "Basic Calculus",
      GENBIO: "General Biology 2",
      "GEN BIO": "General Biology 2",
      "GEN. BIO": "General Biology 2",
      "GENERAL BIO": "General Biology 2",
      "GENERAL BIO 2": "General Biology 2",
    };

    if (normalizedLabel === "HOPE") {
      const hopeName = gradeLevel === "G12"
        ? "Health Optimization Program for Education 4"
        : "Health Optimization Program for Education 3";
      const hopeSubject = subjects.find(
        (subject) => normalizeSubjectLabel(subject.name) === normalizeSubjectLabel(hopeName)
      );
      if (hopeSubject) return hopeSubject.id;
    }

    if (normalizedLabel === "HRGP") {
      const hrgpSubject = subjects.find(
        (subject) => normalizeSubjectLabel(subject.name) === "HOMEROOMGUIDANCEPROGRAM"
      );
      if (hrgpSubject) return hrgpSubject.id;
    }

    const variantMap: Record<string, string[]> = {
      FBS: ["Food and Beverage Services"],
      RESCAP: ["Research Capstone", "Research/Capstone", "Research/Capstone Project"],
      CAREERADV: ["Career Advocacy"],
      IMMERSION: ["Work Immersion"],
      BSI: ["Business Simulation"],
    };

    const variants = variantMap[normalizedLabel];
    if (variants) {
      const variantSubject = subjects.find((subject) =>
        variants.some(
          (variant) => normalizeSubjectLabel(subject.name) === normalizeSubjectLabel(variant)
        )
      );
      if (variantSubject) return variantSubject.id;

      const keywordMap: Record<string, string[]> = {
        FBS: ["FOOD", "BEVERAGE"],
        RESCAP: ["RESEARCH", "CAPSTONE"],
        CAREERADV: ["CAREER", "ADVOCACY"],
        IMMERSION: ["WORK", "IMMERSION"],
        BSI: ["BUSINESS", "SIMULATION"],
      };
      const keywords = keywordMap[normalizedLabel] || [];
      const keywordSubject = subjects.find((subject) => {
        const normalizedName = normalizeSubjectLabel(subject.name);
        return keywords.length > 0 && keywords.every((keyword) => normalizedName.includes(keyword));
      });
      if (keywordSubject) return keywordSubject.id;
    }

    const alias = aliasMap[normalizedLabel];
    if (alias) {
      const aliasSubject = subjects.find(
        (subject) => normalizeSubjectLabel(subject.name) === normalizeSubjectLabel(alias)
      );
      if (aliasSubject) return aliasSubject.id;
    }

    // Fallback: search by keyword if it contains "reading" or other common keywords
    if (normalizedLabel.includes("READING")) {
      const readingSubject = subjects.find(
        (s) => normalizeSubjectLabel(s.name).includes("READING")
      );
      if (readingSubject) return readingSubject.id;
    }

    return "";
  }

  function getCurrentPrefillLabel(label: string, gradeLevel: string) {
    const subjectId = findSubjectIdForPrefill(label, gradeLevel);
    return subjects.find((subject) => subject.id === subjectId)?.name || label;
  }

  function getSubjectDisplayLabel(subjectName: string) {
    const normalizedSubject = normalizeSubjectLabel(subjectName);
    const shortcutMap: Record<string, string> = {
      PRACTICALRESEARCH1: "PR",
      READINGANDWRITINGSKILLS: "READING & WRITING",
      STATISTICSANDPROBABILITY: "STAT",
      PHYSICALSCIENCE: "PhySci",
      ELECTRICALINSTALLATIONANDMAINTENANCE: "EIM",
      HEALTHOPTIMIZATIONPROGRAMFOREDUCATION3: "HOPE",
      HEALTHOPTIMIZATIONPROGRAMFOREDUCATION4: "HOPE",
      HOMEROOMGUIDANCEPROGRAM: "HRGP",
      HOPF: "HOPE",
      HOPEF: "HOPE",
      DISASTERREADINESSANDRISKREDUCTION: "DRRR",
      PERSONALDEVELOPMENT: "PERDEV",
      MEDIAANDINFORMATIONLITERACY: "MIL",
      WORKIMMERSIONCAREERADVOCACYCOUNSELINGANDPLACEMENTSUPPORT: "IMMERSION",
      TRENDSNETWORKSANDCRITICALTHINKINGINTHE21STCENTURY: "TRENDS",
      INQUIRIESINVESTIGATIONSANDIMMERSION: "3Is",
      ENGLISHFORACADEMICANDPROFESSIONALPURPOSES: "EAPP",
      GENERALPHYSICS2: "GEN.Phy",
      INTRODUCTIONTOWORLDRELIGIONSANDBELIEFSYSTEMS: "INTRO TO WORLD",
      BEAUTYNAILANDCULTURE: "BNC",
      HOUSEKEEPING: "HOUSEKEEPING",
      FUNDAMENTALSOFACCOUNTANCYBUSINESSANDMANAGEMENT1: "FABM1",
      FUNDAMENTALSOFACCOUNTANCYBUSINESSANDMANAGEMENT2: "FABM",
      PRINCIPLESOFMARKETING: "PM",
      BUSINESSETHICSANDSOCIALRESPONSIBILITY: "BESR",
      CREATIVEWRITING: "CW",
    };

    if (shortcutMap[normalizedSubject]) {
      return shortcutMap[normalizedSubject];
    }

    if (normalizedSubject.includes("UNDERSTANDINGCULTURE")) {
      return "UCSP";
    }
    if (normalizedSubject.includes("PAGBASA")) {
      return "PAGBASA";
    }
    if (normalizedSubject.includes("READING")) {
      return "READING & WRITING";
    }
    if (normalizedSubject.includes("FUNDAMENTALSOFACCOUNTANCY")) {
      return "FAM";
    }
    if (normalizedSubject.includes("PRINCIPLESOFMARKETING")) {
      return "PM";
    }
    if (normalizedSubject.includes("BUSINESSETHICS")) {
      return "BESR";
    }
    if (normalizedSubject.includes("CREATIVEWRITING")) {
      return "CW";
    }
    if (normalizedSubject.includes("DISCIPLINESANDIDEAS")) {
      return "DIAS";
    }

    return subjectName;
  }

  function getSubjectColor(subjectName: string) {
    const label = normalizeSubjectLabel(getSubjectDisplayLabel(subjectName));
    if (label.includes("STAT")) return "bg-amber-300 text-black border-amber-500";
    if (label.includes("PAGBASA")) return "bg-cyan-500 text-black border-cyan-700";
    if (label.includes("HOPE") || label.includes("HRGP")) return "bg-violet-700 text-white border-violet-900";
    if (label.includes("READING")) return "bg-rose-200 text-black border-rose-400";
    if (label.includes("DRRR")) return "bg-pink-300 text-black border-pink-500";
    if (label.includes("GENBIO") || label.includes("GENPHY")) return "bg-green-600 text-white border-green-800";
    if (label === "PR" || label === "PR1") return "bg-red-600 text-white border-red-800";
    if (label.includes("UCSP")) return "bg-lime-400 text-black border-lime-600";
    if (label.includes("PHYSCI")) return "bg-red-700 text-white border-red-900";
    if (label.includes("FABM") || label.includes("FAM")) return "bg-amber-100 text-black border-amber-300";
    if (label.includes("PERDEV")) return "bg-yellow-300 text-black border-yellow-500";
    if (label.includes("MIL")) return "bg-sky-100 text-black border-sky-300";
    if (label.includes("EAPP")) return "bg-green-700 text-white border-green-900";
    if (label.includes("IMMERSION")) return "bg-teal-800 text-white border-teal-950";
    if (label.includes("TRENDS")) return "bg-cyan-500 text-black border-cyan-700";
    if (label.includes("CAREERADV")) return "bg-yellow-400 text-black border-yellow-600";
    if (label.includes("CENIZA")) return "bg-yellow-600 text-black border-yellow-800";
    if (label.includes("REYES")) return "bg-purple-600 text-white border-purple-900";
    if (label.includes("3IS")) return "bg-red-800 text-white border-red-950";
    if (label.includes("FBS")) return "bg-blue-950 text-white border-blue-950";
    if (label.includes("BESR")) return "bg-amber-900 text-white border-amber-950";
    if (label.includes("INTROTOWORLD")) return "bg-yellow-600 text-black border-yellow-800";
    if (label.includes("EIM")) return "bg-slate-200 text-black border-slate-400";
    if (label.includes("RESCAP")) return "bg-blue-600 text-white border-blue-800";
    if (label.includes("NONOI")) return "bg-orange-300 text-black border-orange-500";
    if (label.includes("CARAD")) return "bg-green-100 text-black border-green-300";
    if (label.includes("BSI")) return "bg-yellow-300 text-black border-yellow-500";
    return "bg-gradient-to-br from-indigo-500/40 to-purple-500/40 text-slate-100 border-indigo-400/50";
  }

  function isSlotAllowedForSection(sectionName: string, timeSlot: TimeSlot) {
    const normalized = (sectionName || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (timeSlot.startTime === "17:00") {
      return normalized === "PHYTAGORAS" || normalized === "PDL";
    }
    return true;
  }

  function formatTime(time: string): string {
    const normalized = (time || "").trim();
    const match = normalized.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return normalized;

    const hour24 = Number(match[1]);
    const minutes = match[2];
    const period = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;

    return `${String(hour12).padStart(2, "0")}:${minutes} ${period}`;
  }

  function formatCompactTime(time: string): string {
    const normalized = (time || "").trim();
    const match = normalized.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return normalized;

    const hour24 = Number(match[1]);
    const minutes = match[2];
    const hour12 = hour24 % 12 || 12;

    return `${hour12}:${minutes}`;
  }

  function openAssignModal(sectionId: string, timeSlotId: string, subjectId?: string, label?: string) {
    const existingSchedule = getScheduleForSlot(sectionId, timeSlotId);
    if (existingSchedule) {
      setError("This slot is already assigned. Delete first to reassign.");
      return;
    }
    setSelectedSlot({ sectionId, timeSlotId });
    setShowModal(true);
    setError("");
    setSuccess("");
    setSelectedTeacher("");
    setPrefillLabel(label || "");
    
    // Try to find subject ID
    let finalSubjectId = subjectId;
    if (!finalSubjectId && label) {
      // Retry with the label if subjectId wasn't found
      finalSubjectId = findSubjectIdForPrefill(label, selectedSection?.gradeLevel);
    }
    
    setSelectedSubject(finalSubjectId || "");
  }

  const selectedSection = selectedSlot
    ? sections.find((section) => section.id === selectedSlot.sectionId) || null
    : null;

  const availableSubjects = selectedSection
    ? subjects.filter((subject) => {
        const matchesGrade = subject.gradeLevel === selectedSection.gradeLevel;
        const track = subject.track?.trim();
        const sectionTrack = selectedSection.track?.trim();
        const matchesTrack = !track || track === sectionTrack;
        return matchesGrade && matchesTrack;
      })
    : subjects.filter((subject) => subject.gradeLevel === selectedGrade);

  const availableTeachers = teachers;

  async function handleAssign() {
    if (!selectedSlot || !selectedTeacher) {
      setError("Please select a teacher");
      return;
    }

    if (!selectedSubject) {
      setError("No subject assigned to this slot. Please select a slot with a subject.");
      return;
    }

    try {
      const matchingSlotIds = timeSlots
        .filter((timeSlot) => {
          const prefill = getImagePrefill(
            selectedSection?.scheduleKey || selectedSection?.name || "",
            timeSlot.day,
            timeSlot.startTime
          );
          return prefill && findSubjectIdForPrefill(prefill.label, selectedSection?.gradeLevel) === selectedSubject;
        })
        .filter((timeSlot) => {
          const existing = getScheduleForSlot(selectedSlot.sectionId, timeSlot.id);
          return !existing;
        })
        .map((timeSlot) => timeSlot.id);

      if (!matchingSlotIds.includes(selectedSlot.timeSlotId)) {
        matchingSlotIds.unshift(selectedSlot.timeSlotId);
      }

      // Assign all matching day slots in a single atomic request: if any day in the
      // group conflicts, none of the slots are created (no more partial assignments).
      const response = await fetch("/api/admin/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: selectedTeacher,
          subjectId: selectedSubject,
          sectionId: selectedSlot.sectionId,
          timeSlotIds: matchingSlotIds,
          room: null,
          overrideRules: true,
          overrideReason: "Admin schedule builder assignment",
        }),
      });

      if (response.ok) {
        const createdSchedules = await response.json();
        const createdScheduleList = Array.isArray(createdSchedules)
          ? createdSchedules
          : [createdSchedules];
        const updatedSchedules = [...schedules, ...createdScheduleList];
        setSchedules(updatedSchedules);
        onSchedulesUpdate?.(updatedSchedules);
        setSuccess(`Teacher assigned to ${matchingSlotIds.length} matching subject slot(s)!`);
        setShowModal(false);
        setSelectedSlot(null);
        setSelectedTeacher("");
        setSelectedSubject("");
        setPrefillLabel("");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to assign class");
      }
    } catch (error) {
      setError("Error assigning class");
      console.error(error);
    }
  }

  async function handleDelete(scheduleId: string) {
    if (!confirm("Remove this assignment?")) return;

    try {
      const selectedSchedule = schedules.find((schedule) => schedule.id === scheduleId);
      const schedulesToDelete = selectedSchedule
        ? schedules.filter(
            (schedule) =>
              schedule.section.id === selectedSchedule.section.id &&
              schedule.subject.id === selectedSchedule.subject.id
          )
        : schedules.filter((schedule) => schedule.id === scheduleId);

      const responses = await Promise.all(
        schedulesToDelete.map((schedule) =>
          fetch(`/api/admin/schedules?id=${schedule.id}`, {
            method: "DELETE",
          })
        )
      );

      if (responses.every((response) => response.ok)) {
        setSuccess(`Removed ${schedulesToDelete.length} assignment(s)`);
        loadData();
      } else {
        setError("Failed to remove assignment");
      }
    } catch (error) {
      setError("Error removing assignment");
      console.error(error);
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Loading...</div>;
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-xl">
      {/* Grade and section navigation */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm font-semibold text-slate-300">Grade Level:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedGrade("G11")}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              selectedGrade === "G11"
                ? "bg-indigo-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            Grade 11
          </button>
          <button
            onClick={() => setSelectedGrade("G12")}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              selectedGrade === "G12"
                ? "bg-indigo-600 text-white"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            Grade 12
          </button>
        </div>
        <span className="text-sm text-slate-500">
          ({gradeSections.length} sections)
        </span>
      </div>

        {gradeSections.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedSectionIndex(Math.max(0, selectedSectionIndex - 1))}
              disabled={selectedSectionIndex === 0}
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <div className="group relative">
              <button
                type="button"
                className="rounded-lg border border-indigo-400 bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                title="Hover over a section to preview it"
              >
                {currentSection?.name} ({selectedSectionIndex + 1}/{gradeSections.length})
              </button>
              <div className="invisible absolute left-0 top-full z-30 mt-2 min-w-52 rounded-lg border border-slate-600 bg-slate-900 p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
                {gradeSections.map((section, index) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setSelectedSectionIndex(index)}
                    className={`block w-full rounded px-3 py-2 text-left text-sm transition hover:bg-slate-700 ${index === selectedSectionIndex ? "bg-slate-700 text-white" : "text-slate-300"}`}
                  >
                    {section.name} <span className="text-xs text-slate-500">({section.track})</span>
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedSectionIndex(Math.min(gradeSections.length - 1, selectedSectionIndex + 1))}
              disabled={selectedSectionIndex >= gradeSections.length - 1}
              className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Master Schedule Table */}
      <div className="mb-2 text-xs text-slate-400">One section is shown at a time. Use Next or hover the section name to switch.</div>
      <div className="w-full overflow-hidden border border-slate-700 rounded-lg">
        <table className="w-full table-fixed border-collapse bg-slate-800">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-700">
              {/* Time column */}
              <th className="w-28 border border-slate-700 px-2 py-3 text-left text-xs font-bold text-slate-300 bg-slate-950 sticky left-0 z-20">
                TIME
              </th>

              {/* Section columns */}
              {displayedSections.map((section, sectionIndex) => (
                <th
                  key={section.id}
                  colSpan={5}
                  className={`border border-slate-700 px-3 py-3 text-center text-sm font-bold text-white bg-slate-800 ${
                    sectionIndex > 0 ? "border-l-4 border-l-indigo-500/70" : ""
                  }`}
                >
                  <div className="font-semibold">{section.name}</div>
                  <div className="text-xs text-slate-400">{section.track}</div>
                </th>
              ))}
            </tr>

            {/* Days row */}
            <tr className="bg-slate-900 border-b border-slate-700">
              <th className="border border-slate-700 px-3 py-2 bg-slate-950"></th>
              {displayedSections.map((section, sectionIndex) => (
                <React.Fragment key={`days-${section.id}`}>
                  {uniqueDays.map((day, dayIndex) => (
                    <th
                      key={`${section.id}-${day}`}
                      className={`border border-slate-700 px-2 py-3 text-center text-xs font-semibold text-slate-300 ${
                        sectionIndex > 0 && dayIndex === 0 ? "border-l-4 border-l-indigo-500/70" : ""
                      }`}
                    >
                      {day.substring(0, 3).toUpperCase()}
                    </th>
                  ))}
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {rowTimeSlots.map((timeSlot, rowIndex) => (
              <tr key={timeSlot.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                {/* Time cell */}
                <td className={`border border-slate-700 px-2 py-3 text-xs font-bold text-slate-200 bg-slate-950 sticky left-0 z-10 whitespace-nowrap ${
                  rowIndex % 2 === 0 ? "bg-slate-950" : "bg-slate-900"
                }`}>
                  <div className="text-xs leading-none">
                    {formatCompactTime(timeSlot.startTime)}-{formatCompactTime(timeSlot.endTime)}
                  </div>
                </td>

                {/* Schedule cells */}
                {displayedSections.map((section, sectionIndex) => (
                  <React.Fragment key={`cells-${section.id}`}>
                    {fixedBreakStartTimes.has(timeSlot.startTime) ? (
                      <td
                        colSpan={uniqueDays.length}
                        className="border border-slate-700 px-2 py-2 text-center text-xs font-semibold text-slate-950 bg-pink-300"
                      >
                        {timeSlot.startTime === "09:45" ? "RECESS" : "LUNCH BREAK"}
                      </td>
                    ) : (
                    uniqueDays.map((day, dayIndex) => {
                      // Find slot for this day
                      const slot = timeSlots.find(
                        ts => ts.day === day && ts.startTime === timeSlot.startTime
                      );
                      const schedule = slot ? getScheduleForSlot(section.id, slot.id) : null;

                      // compute available subjects for this section
                      const sectionSubjects = subjects.filter((s) => {
                        const matchesGrade = s.gradeLevel === section.gradeLevel;
                        const track = s.track?.trim();
                        const sectionTrack = section.track?.trim();
                        const matchesTrack = !track || track === sectionTrack;
                        return matchesGrade && matchesTrack;
                      });

                      const prefill = slot ? getImagePrefill(section.scheduleKey || section.name, day, slot.startTime) : null;
                      const slotAllowed = slot && isSlotAllowedForSection(section.scheduleKey || section.name, slot);
                      const isBreakSlot = prefill?.disableClick === true;

                      return (
                        <td
                          key={`${section.id}-${day}-${timeSlot.id}`}
                          className={`border border-slate-700 px-1 py-1 text-[10px] align-top h-20 ${
                            sectionIndex > 0 && dayIndex === 0 ? "border-l-4 border-l-indigo-500/70" : ""
                          } ${
                            schedule
                              ? "bg-gradient-to-br from-indigo-500/30 to-purple-500/30 cursor-default"
                              : isBreakSlot
                              ? "bg-slate-800/30 cursor-default"
                              : rowIndex % 2 === 0
                              ? "bg-slate-800/50 hover:bg-slate-700/50 cursor-pointer"
                              : "bg-slate-800/70 hover:bg-slate-700/60 cursor-pointer"
                          }`}
                          onClick={() => slot && !schedule && slotAllowed && !isBreakSlot && openAssignModal(section.id, slot.id)}
                        >
                          {schedule ? (
                            isNeutralSection(section.name) ? (
                              <div className="rounded bg-slate-800/60 border border-slate-600 p-2 h-full overflow-hidden flex flex-col justify-center items-center text-slate-300 text-[11px]">
                                <div className="font-semibold">{getSubjectDisplayLabel(schedule.subject.name)}</div>
                                <div className="text-[10px] text-slate-400 mt-1">{schedule.teacher.user.name}</div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(schedule.id);
                                  }}
                                  className="text-[10px] px-2 py-1 bg-red-500/30 hover:bg-red-500/50 text-red-200 border border-red-400/30 rounded transition mt-2"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <div className={`rounded border p-2 h-full overflow-hidden flex flex-col justify-between ${getSubjectColor(schedule.subject.name)}`}>
                                <div>
                                  <div className="font-bold text-current text-[10px] leading-tight">
                                    {schedule.teacher.user.name}
                                  </div>
                                  <div className="text-current text-[11px] leading-tight mt-1">
                                    {getSubjectDisplayLabel(schedule.subject.name)}
                                  </div>
                                  {schedule.room && (
                                    <div className="text-current text-[10px] mt-1 opacity-75">
                                      Room: {schedule.room}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(schedule.id);
                                  }}
                                  className="text-[10px] px-2 py-1 bg-red-500/30 hover:bg-red-500/50 text-red-200 border border-red-400/30 rounded transition mt-2"
                                >
                                  Remove
                                </button>
                              </div>
                            )
                          ) : prefill ? (
                            prefill.disableClick ? (
                              <div
                                className={`w-full h-full rounded ${prefill.bg || "bg-slate-600"} ${prefill.textColor || "text-white"} p-2 flex items-center justify-center text-[12px] font-semibold text-center leading-tight cursor-default`}
                              >
                                {getCurrentPrefillLabel(prefill.label, section.gradeLevel)}
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!slot) return;
                                  const prefillSubjectId = findSubjectIdForPrefill(prefill.label, section.gradeLevel);
                                  openAssignModal(section.id, slot.id, prefillSubjectId, prefill.label);
                                }}
                                className={`w-full h-full rounded ${prefill.bg || "bg-slate-600"} ${prefill.textColor || "text-white"} p-2 flex items-center justify-center text-[12px] font-semibold text-center leading-tight`}
                              >
                                  {getCurrentPrefillLabel(prefill.label, section.gradeLevel)}
                              </button>
                            )
                          ) : slotAllowed ? (
                            // show a centered plus button for empty cells — click to open assign modal
                            <div className="h-full flex items-center justify-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!slot) return;
                                  openAssignModal(section.id, slot.id);
                                }}
                                aria-label="Add class"
                                className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 text-xl"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center text-slate-500 text-[10px]">
                              Not available
                            </div>
                          )}
                        </td>
                      );
                    })
                    )}
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {gradeSections.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          No sections found for {selectedGrade}
        </div>
      )}

      {/* Messages */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-red-300 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-green-300 text-sm">
          {success}
        </div>
      )}

      {/* Assignment Modal */}
      {showModal && selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-slate-800 border border-slate-700 shadow-2xl">
            <div className="border-b border-slate-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Assign Class</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedSlot(null);
                  setSelectedSubject("");
                  setSelectedTeacher("");
                  setPrefillLabel("");
                  setError("");
                }}
                className="text-slate-400 hover:text-white transition"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Subject</label>
                <div className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-slate-200 text-sm">
                  {selectedSubject ? (
                    subjects.find((s) => s.id === selectedSubject)?.name || "Unknown"
                  ) : prefillLabel ? (
                    <span className="text-slate-400">{prefillLabel} (lookup failed)</span>
                  ) : (
                    <span className="text-slate-400">No subject assigned to this slot</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Teacher</label>
                <select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select teacher...</option>
                  {availableTeachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedSlot(null);
                    setSelectedSubject("");
                    setSelectedTeacher("");
                    setPrefillLabel("");
                    setError("");
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
