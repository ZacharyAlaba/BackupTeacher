import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findImagePrefillEntries } from "@/lib/imagePrefill";
import { normalizeSubjectName } from "@/lib/normalizeSubjectName";

type ScheduleItem = {
  day: string;
  timeSlot: string;
  subject: string;
  section: string;
  room: string | null;
};

type TimeSlotItem = {
  startTime: string;
  endTime: string;
};

const demoSchedule: ScheduleItem[] = [
  {
    day: "Monday",
    timeSlot: "09:30 AM-10:30 AM",
    subject: "Oral Communication",
    section: "G11 - HUMSS A",
    room: "SHS-201",
  },
  {
    day: "Wednesday",
    timeSlot: "09:30 AM-10:30 AM",
    subject: "Oral Communication",
    section: "G11 - HUMSS A",
    room: "SHS-201",
  },
  {
    day: "Tuesday",
    timeSlot: "01:30 PM-02:30 PM",
    subject: "Practical Research 1",
    section: "G11 - HUMSS B",
    room: "SHS-203",
  },
  {
    day: "Thursday",
    timeSlot: "01:30 PM-02:30 PM",
    subject: "Practical Research 1",
    section: "G11 - HUMSS B",
    room: "SHS-203",
  },
  {
    day: "Friday",
    timeSlot: "03:30 PM-04:30 PM",
    subject: "Reading and Writing",
    section: "G12 - HUMSS A",
    room: "SHS-205",
  },
];

const demoTimeSlots: TimeSlotItem[] = [
  { startTime: "07:30 AM", endTime: "08:30 AM" },
  { startTime: "08:30 AM", endTime: "09:30 AM" },
  { startTime: "09:30 AM", endTime: "10:30 AM" },
  { startTime: "10:30 AM", endTime: "11:30 AM" },
  { startTime: "11:30 AM", endTime: "12:30 PM" },
  { startTime: "12:30 PM", endTime: "01:30 PM" },
  { startTime: "01:30 PM", endTime: "02:30 PM" },
  { startTime: "02:30 PM", endTime: "03:30 PM" },
  { startTime: "03:30 PM", endTime: "04:30 PM" },
  { startTime: "04:30 PM", endTime: "05:30 PM" },
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function formatTimeForDisplay(value: string) {
  const normalized = value.trim();
  if (/am|pm/i.test(normalized)) {
    return normalized.toUpperCase();
  }

  const match = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return normalized;
  }

  const hour24 = Number(match[1]);
  const minute = match[2];
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  // display without leading zero ("1:00 PM" instead of "01:00 PM")
  return `${hour12}:${minute} ${suffix}`;
}

function timeToMinutes(value: string) {
  const normalized = value.trim().toUpperCase();
  const ampmMatch = normalized.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/);
  if (ampmMatch) {
    let hour = Number(ampmMatch[1]) % 12;
    const minute = Number(ampmMatch[2]);
    if (ampmMatch[3] === "PM") {
      hour += 12;
    }
    return hour * 60 + minute;
  }

  const hhmmMatch = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmmMatch) {
    return Number(hhmmMatch[1]) * 60 + Number(hhmmMatch[2]);
  }

  return 0;
}

type FallbackTemplate = {
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  room: string;
  teacherName: string;
  teacherEmail: string;
};

function normalizeSectionName(sectionName: string) {
  return sectionName
    .trim()
    .replace(/\s*[-–—]\s*/g, "-")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function buildSectionFallback(track: string, teacherName: string, teacherEmail: string): FallbackTemplate[] {
  const defaultTemplates: Record<string, Omit<FallbackTemplate, "teacherName" | "teacherEmail">[]> = {
    STEM: [
      { day: "Monday", startTime: "07:45", endTime: "08:45", subject: "Basic Calculus", room: "SHS-201" },
      { day: "Monday", startTime: "10:00", endTime: "11:00", subject: "Physical Science", room: "SHS-204" },
      { day: "Monday", startTime: "13:00", endTime: "14:00", subject: "General Biology 2", room: "SHS-202" },
      { day: "Tuesday", startTime: "07:45", endTime: "08:45", subject: "Practical Research 1", room: "SHS-203" },
      { day: "Tuesday", startTime: "10:00", endTime: "11:00", subject: "Disciplines and Ideas in the Applied Social Sciences", room: "SHS-202" },
      { day: "Tuesday", startTime: "13:00", endTime: "14:00", subject: "Health Optimization Program for Education 3", room: "SHS-205" },
      { day: "Wednesday", startTime: "07:45", endTime: "08:45", subject: "Electrical Installation and Maintenance", room: "SHS-201" },
      { day: "Wednesday", startTime: "10:00", endTime: "11:00", subject: "Bread and Pastry Production", room: "SHS-203" },
      { day: "Thursday", startTime: "07:45", endTime: "08:45", subject: "Basic Calculus", room: "SHS-201" },
      { day: "Thursday", startTime: "10:00", endTime: "11:00", subject: "Physical Science", room: "SHS-204" },
      { day: "Friday", startTime: "07:45", endTime: "08:45", subject: "Practical Research 1", room: "SHS-203" },
      { day: "Friday", startTime: "10:00", endTime: "11:00", subject: "General Biology 2", room: "SHS-202" },
    ],
    HUMSS: [
      { day: "Monday", startTime: "07:45", endTime: "08:45", subject: "Reading and Writing Skills", room: "SHS-201" },
      { day: "Monday", startTime: "10:00", endTime: "11:00", subject: "Understanding Culture, Society, and Politics", room: "SHS-204" },
      { day: "Monday", startTime: "13:00", endTime: "14:00", subject: "Creative Writing", room: "SHS-202" },
      { day: "Tuesday", startTime: "07:45", endTime: "08:45", subject: "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik", room: "SHS-202" },
      { day: "Tuesday", startTime: "10:00", endTime: "11:00", subject: "Practical Research 1", room: "SHS-203" },
      { day: "Tuesday", startTime: "13:00", endTime: "14:00", subject: "Disciplines and Ideas in the Applied Social Sciences", room: "SHS-205" },
      { day: "Wednesday", startTime: "07:45", endTime: "08:45", subject: "Statistics and Probability", room: "SHS-201" },
      { day: "Wednesday", startTime: "10:00", endTime: "11:00", subject: "Health Optimization Program for Education 3", room: "SHS-204" },
      { day: "Thursday", startTime: "07:45", endTime: "08:45", subject: "Reading and Writing Skills", room: "SHS-201" },
      { day: "Thursday", startTime: "10:00", endTime: "11:00", subject: "Understanding Culture, Society, and Politics", room: "SHS-204" },
      { day: "Friday", startTime: "07:45", endTime: "08:45", subject: "Practical Research 1", room: "SHS-203" },
      { day: "Friday", startTime: "10:00", endTime: "11:00", subject: "Creative Writing", room: "SHS-202" },
    ],
    ABM: [
      { day: "Monday", startTime: "07:45", endTime: "08:45", subject: "Fundamentals of Accountancy, Business, and Management 1", room: "SHS-201" },
      { day: "Monday", startTime: "10:00", endTime: "11:00", subject: "Principles of Marketing", room: "SHS-204" },
      { day: "Monday", startTime: "13:00", endTime: "14:00", subject: "Business Ethics and Social Responsibility", room: "SHS-202" },
      { day: "Tuesday", startTime: "07:45", endTime: "08:45", subject: "Creative Writing", room: "SHS-203" },
      { day: "Tuesday", startTime: "10:00", endTime: "11:00", subject: "Practical Research 1", room: "SHS-205" },
      { day: "Tuesday", startTime: "13:00", endTime: "14:00", subject: "Disciplines and Ideas in the Applied Social Sciences", room: "SHS-205" },
      { day: "Wednesday", startTime: "07:45", endTime: "08:45", subject: "Statistics and Probability", room: "SHS-201" },
      { day: "Wednesday", startTime: "10:00", endTime: "11:00", subject: "Health Optimization Program for Education 3", room: "SHS-204" },
      { day: "Thursday", startTime: "07:45", endTime: "08:45", subject: "Fundamentals of Accountancy, Business, and Management 1", room: "SHS-201" },
      { day: "Thursday", startTime: "10:00", endTime: "11:00", subject: "Principles of Marketing", room: "SHS-204" },
      { day: "Friday", startTime: "07:45", endTime: "08:45", subject: "Creative Writing", room: "SHS-203" },
      { day: "Friday", startTime: "10:00", endTime: "11:00", subject: "Practical Research 1", room: "SHS-205" },
    ],
    GAS: [
      { day: "Monday", startTime: "07:45", endTime: "08:45", subject: "Statistics and Probability", room: "SHS-201" },
      { day: "Monday", startTime: "10:00", endTime: "11:00", subject: "Health Optimization Program for Education 3", room: "SHS-204" },
      { day: "Monday", startTime: "13:00", endTime: "14:00", subject: "Basic Calculus", room: "SHS-202" },
      { day: "Tuesday", startTime: "07:45", endTime: "08:45", subject: "Reading and Writing Skills", room: "SHS-202" },
      { day: "Tuesday", startTime: "10:00", endTime: "11:00", subject: "Understanding Culture, Society, and Politics", room: "SHS-203" },
      { day: "Tuesday", startTime: "13:00", endTime: "14:00", subject: "Practical Research 1", room: "SHS-205" },
      { day: "Wednesday", startTime: "07:45", endTime: "08:45", subject: "Disciplines and Ideas in the Applied Social Sciences", room: "SHS-201" },
      { day: "Wednesday", startTime: "10:00", endTime: "11:00", subject: "Bread and Pastry Production", room: "SHS-203" },
      { day: "Thursday", startTime: "07:45", endTime: "08:45", subject: "Electrical Installation and Maintenance", room: "SHS-201" },
      { day: "Thursday", startTime: "10:00", endTime: "11:00", subject: "Basic Calculus", room: "SHS-201" },
      { day: "Friday", startTime: "07:45", endTime: "08:45", subject: "Creative Writing", room: "SHS-204" },
      { day: "Friday", startTime: "10:00", endTime: "11:00", subject: "Health Optimization Program for Education 3", room: "SHS-204" },
    ],
  };

  return (defaultTemplates[track] ?? defaultTemplates.STEM).map((slot) => ({
    ...slot,
    teacherName,
    teacherEmail,
  }));
}

const sectionSlotTimes: { startTime: string; endTime: string }[] = [
  { startTime: "07:45", endTime: "08:45" },
  { startTime: "08:45", endTime: "09:45" },
  { startTime: "10:00", endTime: "11:00" },
  { startTime: "11:00", endTime: "12:00" },
  { startTime: "13:00", endTime: "14:00" },
  { startTime: "14:00", endTime: "15:00" },
  { startTime: "15:00", endTime: "16:00" },
  { startTime: "16:00", endTime: "17:00" },
  { startTime: "17:00", endTime: "18:00" },
];

const sectionDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const subjectTeacherMap: Record<string, { teacherName: string; teacherEmail: string }> = {
  "Basic Calculus": { teacherName: "Ms. SABAYDAY", teacherEmail: "sabayday@school.edu" },
  "General Biology 2": { teacherName: "Ms. MONTEDERAMOS", teacherEmail: "montederamos@school.edu" },
  "Physical Science": { teacherName: "Ms. ABLIN", teacherEmail: "ablin@school.edu" },
  "Practical Research 1": { teacherName: "Ms. GONZAGA", teacherEmail: "gonzaga@school.edu" },
  "Health Optimization Program for Education 3": { teacherName: "Ms. LUSTRE", teacherEmail: "lustre@school.edu" },
  "Disaster Readiness and Risk Reduction": { teacherName: "Ms. BALUAT", teacherEmail: "baluat@school.edu" },
  "Reading and Writing Skills": { teacherName: "Ms. NATULLA", teacherEmail: "natulla@school.edu" },
  "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik": { teacherName: "Ms. CAPILITAN", teacherEmail: "capilitan@school.edu" },
  "Statistics and Probability": { teacherName: "Ms. MAGALLANES", teacherEmail: "magallanes@school.edu" },
  "Understanding Culture, Society, and Politics": { teacherName: "Ms. BANCALE", teacherEmail: "bancale@school.edu" },
  "Fundamentals of Accountancy, Business, and Management 1": { teacherName: "Ms. OJEL", teacherEmail: "ojel@school.edu" },
  "Principles of Marketing": { teacherName: "Ms. DAYGO", teacherEmail: "daygo@school.edu" },
  "Business Ethics and Social Responsibility": { teacherName: "Ms. OJEL", teacherEmail: "ojel@school.edu" },
  "Creative Writing": { teacherName: "Ms. QUINIQUITO", teacherEmail: "quiniquito@school.edu" },
  "Disciplines and Ideas in the Applied Social Sciences": { teacherName: "Ms. BANCALE", teacherEmail: "bancale@school.edu" },
  "Electrical Installation and Maintenance": { teacherName: "Ms. ABLIN", teacherEmail: "ablin@school.edu" },
  "Bread and Pastry Production": { teacherName: "Ms. GONZAGA", teacherEmail: "gonzaga@school.edu" },
};

const subjectRoomMap: Record<string, string> = {
  "Basic Calculus": "SHS-201",
  "General Biology 2": "SHS-202",
  "Physical Science": "SHS-201",
  "Practical Research 1": "SHS-203",
  "Health Optimization Program for Education 3": "SHS-205",
  "Disaster Readiness and Risk Reduction": "SHS-201",
  "Reading and Writing Skills": "SHS-203",
  "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik": "SHS-202",
  "Statistics and Probability": "SHS-204",
  "Understanding Culture, Society, and Politics": "SHS-205",
  "Fundamentals of Accountancy, Business, and Management 1": "SHS-201",
  "Principles of Marketing": "SHS-201",
  "Business Ethics and Social Responsibility": "SHS-205",
  "Creative Writing": "SHS-202",
  "Disciplines and Ideas in the Applied Social Sciences": "SHS-202",
  "Electrical Installation and Maintenance": "SHS-201",
  "Bread and Pastry Production": "SHS-203",
};

function rotateArray<T>(items: T[], offset: number): T[] {
  return items.map((_, index) => items[(index + offset) % items.length]);
}

function buildTemplatesFromSectionSchedule(sectionName: string, baseSubjects: string[]): FallbackTemplate[] {
  return sectionDays.flatMap((day, dayIndex) => {
    const subjects = rotateArray(baseSubjects, dayIndex);
    return subjects.map((subject, periodIndex) => {
      const teacher = subjectTeacherMap[subject] ?? {
        teacherName: `Ms. ${sectionName.split(/[-\s]+/)[0] || "Teacher"}`,
        teacherEmail: `${sectionName.split(/[-\s]+/)[0].toLowerCase()}@school.edu`,
      };

      return {
        day,
        startTime: sectionSlotTimes[periodIndex].startTime,
        endTime: sectionSlotTimes[periodIndex].endTime,
        subject,
        room: subjectRoomMap[subject] ?? "SHS-201",
        teacherName: teacher.teacherName,
        teacherEmail: teacher.teacherEmail,
      };
    });
  });
}

function getFallbackTemplates(track: string, sectionName: string): FallbackTemplate[] {
  const normalizedSection = normalizeSectionName(sectionName);
  const teacherBase = sectionName.split(/[-\s]+/)[0] || "Teacher";
  const defaultTeacherName = `Ms. ${teacherBase}`;
  const defaultTeacherEmail = `${teacherBase.toLowerCase()}@school.edu`;

  const sectionTrackOverrides: Record<
    string,
    { track: string; teacherName: string; teacherEmail: string; templates?: FallbackTemplate[]; baseSubjects?: string[] }
  > = {
    "ARISTOTLE-DAYGO": {
      track: "STEM",
      teacherName: "Ms. DAYGO",
      teacherEmail: "daygo@school.edu",
      templates: [
        { day: "Monday", startTime: "07:45", endTime: "08:45", subject: "Principles of Marketing", room: "SHS-201", teacherName: "Ms. DAYGO", teacherEmail: "daygo@school.edu" },
        { day: "Monday", startTime: "08:45", endTime: "09:45", subject: "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik", room: "SHS-202", teacherName: "Ms. CAPILITAN", teacherEmail: "capilitan@school.edu" },
        { day: "Monday", startTime: "10:00", endTime: "11:00", subject: "Practical Research 1", room: "SHS-203", teacherName: "Ms. GONZAGA", teacherEmail: "gonzaga@school.edu" },
        { day: "Monday", startTime: "11:00", endTime: "12:00", subject: "Practical Research 1", room: "SHS-203", teacherName: "Ms. GONZAGA", teacherEmail: "gonzaga@school.edu" },
        { day: "Monday", startTime: "13:00", endTime: "14:00", subject: "Understanding Culture, Society, and Politics", room: "SHS-204", teacherName: "Ms. BANCALE", teacherEmail: "bancale@school.edu" },
        { day: "Monday", startTime: "14:00", endTime: "15:00", subject: "Fundamentals of Accountancy, Business, and Management 2", room: "SHS-205", teacherName: "Ms. OJEL", teacherEmail: "ojel@school.edu" },
        { day: "Monday", startTime: "15:00", endTime: "16:00", subject: "Physical Science", room: "SHS-201", teacherName: "Ms. ABLIN", teacherEmail: "ablin@school.edu" },
        { day: "Tuesday", startTime: "07:45", endTime: "08:45", subject: "Principles of Marketing", room: "SHS-201", teacherName: "Ms. DAYGO", teacherEmail: "daygo@school.edu" },
        { day: "Tuesday", startTime: "08:45", endTime: "09:45", subject: "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik", room: "SHS-202", teacherName: "Ms. CAPILITAN", teacherEmail: "capilitan@school.edu" },
        { day: "Tuesday", startTime: "10:00", endTime: "11:00", subject: "Reading and Writing Skills", room: "SHS-203", teacherName: "Ms. QUINIQUITO", teacherEmail: "quiniquito@school.edu" },
        { day: "Tuesday", startTime: "11:00", endTime: "12:00", subject: "Statistics and Probability", room: "SHS-204", teacherName: "Ms. SABAYDAY", teacherEmail: "sabayday@school.edu" },
        { day: "Tuesday", startTime: "13:00", endTime: "14:00", subject: "Understanding Culture, Society, and Politics", room: "SHS-205", teacherName: "Ms. BANCALE", teacherEmail: "bancale@school.edu" },
        { day: "Tuesday", startTime: "14:00", endTime: "15:00", subject: "Fundamentals of Accountancy, Business, and Management 2", room: "SHS-201", teacherName: "Ms. OJEL", teacherEmail: "ojel@school.edu" },
        { day: "Tuesday", startTime: "15:00", endTime: "16:00", subject: "Physical Science", room: "SHS-202", teacherName: "Ms. ABLIN", teacherEmail: "ablin@school.edu" },
        { day: "Wednesday", startTime: "07:45", endTime: "08:45", subject: "Principles of Marketing", room: "SHS-201", teacherName: "Ms. DAYGO", teacherEmail: "daygo@school.edu" },
        { day: "Wednesday", startTime: "08:45", endTime: "09:45", subject: "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik", room: "SHS-202", teacherName: "Ms. CAPILITAN", teacherEmail: "capilitan@school.edu" },
        { day: "Wednesday", startTime: "10:00", endTime: "11:00", subject: "Reading and Writing Skills", room: "SHS-203", teacherName: "Ms. QUINIQUITO", teacherEmail: "quiniquito@school.edu" },
        { day: "Wednesday", startTime: "11:00", endTime: "12:00", subject: "Statistics and Probability", room: "SHS-204", teacherName: "Ms. SABAYDAY", teacherEmail: "sabayday@school.edu" },
        { day: "Wednesday", startTime: "13:00", endTime: "14:00", subject: "Understanding Culture, Society, and Politics", room: "SHS-205", teacherName: "Ms. BANCALE", teacherEmail: "bancale@school.edu" },
        { day: "Wednesday", startTime: "14:00", endTime: "15:00", subject: "Fundamentals of Accountancy, Business, and Management 2", room: "SHS-201", teacherName: "Ms. OJEL", teacherEmail: "ojel@school.edu" },
        { day: "Wednesday", startTime: "15:00", endTime: "16:00", subject: "Physical Science", room: "SHS-202", teacherName: "Ms. ABLIN", teacherEmail: "ablin@school.edu" },
        { day: "Thursday", startTime: "07:45", endTime: "08:45", subject: "Principles of Marketing", room: "SHS-201", teacherName: "Ms. DAYGO", teacherEmail: "daygo@school.edu" },
        { day: "Thursday", startTime: "08:45", endTime: "09:45", subject: "Practical Research 1", room: "SHS-203", teacherName: "Ms. GONZAGA", teacherEmail: "gonzaga@school.edu" },
        { day: "Thursday", startTime: "10:00", endTime: "11:00", subject: "Reading and Writing Skills", room: "SHS-203", teacherName: "Ms. QUINIQUITO", teacherEmail: "quiniquito@school.edu" },
        { day: "Thursday", startTime: "11:00", endTime: "12:00", subject: "Statistics and Probability", room: "SHS-204", teacherName: "Ms. SABAYDAY", teacherEmail: "sabayday@school.edu" },
        { day: "Thursday", startTime: "13:00", endTime: "14:00", subject: "Understanding Culture, Society, and Politics", room: "SHS-205", teacherName: "Ms. BANCALE", teacherEmail: "bancale@school.edu" },
        { day: "Thursday", startTime: "14:00", endTime: "15:00", subject: "Fundamentals of Accountancy, Business, and Management 2", room: "SHS-201", teacherName: "Ms. OJEL", teacherEmail: "ojel@school.edu" },
        { day: "Friday", startTime: "07:45", endTime: "08:45", subject: "Health Optimization Program for Education 3", room: "SHS-201", teacherName: "Ms. LUSTRE", teacherEmail: "lustre@school.edu" },
        { day: "Friday", startTime: "08:45", endTime: "09:45", subject: "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik", room: "SHS-202", teacherName: "Ms. CAPILITAN", teacherEmail: "capilitan@school.edu" },
        { day: "Friday", startTime: "10:00", endTime: "11:00", subject: "Reading and Writing Skills", room: "SHS-203", teacherName: "Ms. QUINIQUITO", teacherEmail: "quiniquito@school.edu" },
        { day: "Friday", startTime: "11:00", endTime: "12:00", subject: "Statistics and Probability", room: "SHS-204", teacherName: "Ms. SABAYDAY", teacherEmail: "sabayday@school.edu" },
        { day: "Friday", startTime: "13:00", endTime: "14:00", subject: "Health Optimization Program for Education 3", room: "SHS-205", teacherName: "Ms. LUSTRE", teacherEmail: "lustre@school.edu" },
        { day: "Friday", startTime: "14:00", endTime: "15:00", subject: "Physical Science", room: "SHS-201", teacherName: "Ms. ABLIN", teacherEmail: "ablin@school.edu" },
        { day: "Friday", startTime: "15:00", endTime: "16:00", subject: "Practical Research 1", room: "SHS-203", teacherName: "Ms. GONZAGA", teacherEmail: "gonzaga@school.edu" },
      ],
    },
    "AURELIUS-CABARRUBIAS": {
      track: "STEM",
      teacherName: "Ms. CABARRUBIAS",
      teacherEmail: "cabarrubias@school.edu",
      baseSubjects: [
        "Basic Calculus",
        "General Biology 2",
        "Disaster Readiness and Risk Reduction",
        "Physical Science",
        "Practical Research 1",
        "Health Optimization Program for Education 3",
        "Statistics and Probability",
      ],
    },
    "CONFUCIUS-MAGALLANES": {
      track: "ABM",
      teacherName: "Ms. MAGALLANES",
      teacherEmail: "magallanes@school.edu",
      baseSubjects: [
        "Fundamentals of Accountancy, Business, and Management 1",
        "Principles of Marketing",
        "Business Ethics and Social Responsibility",
        "Creative Writing",
        "Practical Research 1",
        "Statistics and Probability",
        "Understanding Culture, Society, and Politics",
      ],
    },
    "PLATO-PEREZ": {
      track: "ABM",
      teacherName: "Ms. PEREZ",
      teacherEmail: "perez@school.edu",
      baseSubjects: [
        "Principles of Marketing",
        "Fundamentals of Accountancy, Business, and Management 1",
        "Creative Writing",
        "Business Ethics and Social Responsibility",
        "Practical Research 1",
        "Disciplines and Ideas in the Applied Social Sciences",
        "Reading and Writing Skills",
      ],
    },
    "HUME-BANCALE": {
      track: "HUMSS",
      teacherName: "Ms. BANCALE",
      teacherEmail: "bancale@school.edu",
      baseSubjects: [
        "Reading and Writing Skills",
        "Understanding Culture, Society, and Politics",
        "Practical Research 1",
        "Disciplines and Ideas in the Applied Social Sciences",
        "Statistics and Probability",
        "Creative Writing",
        "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik",
      ],
    },
    "DEMOCRITUS-ALLONAR": {
      track: "HUMSS",
      teacherName: "Ms. ALLONAR",
      teacherEmail: "allonar@school.edu",
      baseSubjects: [
        "Understanding Culture, Society, and Politics",
        "Reading and Writing Skills",
        "Statistics and Probability",
        "Creative Writing",
        "Practical Research 1",
        "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik",
        "Disciplines and Ideas in the Applied Social Sciences",
      ],
    },
    "VOLTAIRE-CAPILITAN": {
      track: "GAS",
      teacherName: "Ms. CAPILITAN",
      teacherEmail: "capilitan@school.edu",
      baseSubjects: [
        "Health Optimization Program for Education 3",
        "Statistics and Probability",
        "Reading and Writing Skills",
        "Practical Research 1",
        "Bread and Pastry Production",
        "Basic Calculus",
        "Electrical Installation and Maintenance",
      ],
    },
    "LOCKE-LOGRONIO": {
      track: "GAS",
      teacherName: "Ms. LOGRONIO",
      teacherEmail: "logronio@school.edu",
      baseSubjects: [
        "Statistics and Probability",
        "Health Optimization Program for Education 3",
        "Bread and Pastry Production",
        "Practical Research 1",
        "Understanding Culture, Society, and Politics",
        "Basic Calculus",
        "Disaster Readiness and Risk Reduction",
      ],
    },
    "LAO TZU-GONZAGA": {
      track: "STEM",
      teacherName: "Ms. GONZAGA",
      teacherEmail: "gonzaga@school.edu",
      baseSubjects: [
        "General Biology 2",
        "Basic Calculus",
        "Health Optimization Program for Education 3",
        "Physical Science",
        "Practical Research 1",
        "Disaster Readiness and Risk Reduction",
        "Statistics and Probability",
      ],
    },
    "SOCRATES-BALUAT": {
      track: "STEM",
      teacherName: "Ms. BALUAT",
      teacherEmail: "baluat@school.edu",
      templates: [ 
        { day: "Monday", startTime: "07:45", endTime: "08:45", subject: "Disaster Readiness and Risk Reduction", room: "SHS-201", teacherName: "Ms. BALUAT", teacherEmail: "baluat@school.edu" },
        { day: "Monday", startTime: "08:45", endTime: "09:45", subject: "Health Optimization Program for Education 3", room: "SHS-201", teacherName: "Ms. LUSTRE", teacherEmail: "lustre@school.edu" },
        { day: "Monday", startTime: "10:00", endTime: "11:00", subject: "General Biology 2", room: "SHS-202", teacherName: "Ms. MONTEDERAMOS", teacherEmail: "montederamos@school.edu" },
        { day: "Monday", startTime: "11:00", endTime: "12:00", subject: "Reading and Writing Skills", room: "SHS-203", teacherName: "Ms. NATULLA", teacherEmail: "natulla@school.edu" },
        { day: "Monday", startTime: "13:00", endTime: "14:00", subject: "Statistics and Probability", room: "SHS-204", teacherName: "Ms. MAGALLANES", teacherEmail: "magallanes@school.edu" },
        { day: "Monday", startTime: "14:00", endTime: "15:00", subject: "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik", room: "SHS-202", teacherName: "Ms. CAPILITAN", teacherEmail: "capilitan@school.edu" },
        { day: "Monday", startTime: "15:00", endTime: "16:00", subject: "Practical Research 1", room: "SHS-203", teacherName: "Ms. GALVE", teacherEmail: "galve@school.edu" },
        { day: "Tuesday", startTime: "07:45", endTime: "08:45", subject: "Disaster Readiness and Risk Reduction", room: "SHS-201", teacherName: "Ms. BALUAT", teacherEmail: "baluat@school.edu" },
        { day: "Tuesday", startTime: "08:45", endTime: "09:45", subject: "Understanding Culture, Society, and Politics", room: "SHS-201", teacherName: "Ms. BIBERA", teacherEmail: "bibera@school.edu" },
        { day: "Tuesday", startTime: "10:00", endTime: "11:00", subject: "Basic Calculus", room: "SHS-204", teacherName: "Ms. SABAYDAY", teacherEmail: "sabayday@school.edu" },
        { day: "Tuesday", startTime: "11:00", endTime: "12:00", subject: "Reading and Writing Skills", room: "SHS-203", teacherName: "Ms. NATULLA", teacherEmail: "natulla@school.edu" },
        { day: "Tuesday", startTime: "13:00", endTime: "14:00", subject: "Statistics and Probability", room: "SHS-204", teacherName: "Ms. MAGALLANES", teacherEmail: "magallanes@school.edu" },
        { day: "Tuesday", startTime: "14:00", endTime: "15:00", subject: "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik", room: "SHS-202", teacherName: "Ms. CAPILITAN", teacherEmail: "capilitan@school.edu" },
        { day: "Tuesday", startTime: "15:00", endTime: "16:00", subject: "Practical Research 1", room: "SHS-203", teacherName: "Ms. GALVE", teacherEmail: "galve@school.edu" },
        { day: "Wednesday", startTime: "07:45", endTime: "08:45", subject: "Disaster Readiness and Risk Reduction", room: "SHS-201", teacherName: "Ms. BALUAT", teacherEmail: "baluat@school.edu" },
        { day: "Wednesday", startTime: "08:45", endTime: "09:45", subject: "Understanding Culture, Society, and Politics", room: "SHS-201", teacherName: "Ms. BIBERA", teacherEmail: "bibera@school.edu" },
        { day: "Wednesday", startTime: "10:00", endTime: "11:00", subject: "Basic Calculus", room: "SHS-204", teacherName: "Ms. SABAYDAY", teacherEmail: "sabayday@school.edu" },
        { day: "Wednesday", startTime: "11:00", endTime: "12:00", subject: "General Biology 2", room: "SHS-202", teacherName: "Ms. MONTEDERAMOS", teacherEmail: "montederamos@school.edu" },
        { day: "Wednesday", startTime: "13:00", endTime: "14:00", subject: "Statistics and Probability", room: "SHS-204", teacherName: "Ms. MAGALLANES", teacherEmail: "magallanes@school.edu" },
        { day: "Wednesday", startTime: "14:00", endTime: "15:00", subject: "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik", room: "SHS-202", teacherName: "Ms. CAPILITAN", teacherEmail: "capilitan@school.edu" },
        { day: "Wednesday", startTime: "15:00", endTime: "16:00", subject: "Practical Research 1", room: "SHS-203", teacherName: "Ms. GALVE", teacherEmail: "galve@school.edu" },
        { day: "Thursday", startTime: "07:45", endTime: "08:45", subject: "Disaster Readiness and Risk Reduction", room: "SHS-201", teacherName: "Ms. BALUAT", teacherEmail: "baluat@school.edu" },
        { day: "Thursday", startTime: "08:45", endTime: "09:45", subject: "Understanding Culture, Society, and Politics", room: "SHS-201", teacherName: "Ms. BIBERA", teacherEmail: "bibera@school.edu" },
        { day: "Thursday", startTime: "10:00", endTime: "11:00", subject: "Basic Calculus", room: "SHS-204", teacherName: "Ms. SABAYDAY", teacherEmail: "sabayday@school.edu" },
        { day: "Thursday", startTime: "11:00", endTime: "12:00", subject: "Reading and Writing Skills", room: "SHS-203", teacherName: "Ms. NATULLA", teacherEmail: "natulla@school.edu" },
        { day: "Thursday", startTime: "13:00", endTime: "14:00", subject: "Statistics and Probability", room: "SHS-204", teacherName: "Ms. MAGALLANES", teacherEmail: "magallanes@school.edu" },
        { day: "Thursday", startTime: "14:00", endTime: "15:00", subject: "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik", room: "SHS-202", teacherName: "Ms. CAPILITAN", teacherEmail: "capilitan@school.edu" },
        { day: "Thursday", startTime: "15:00", endTime: "16:00", subject: "Practical Research 1", room: "SHS-203", teacherName: "Ms. GALVE", teacherEmail: "galve@school.edu" },
        { day: "Friday", startTime: "07:45", endTime: "08:45", subject: "Health Optimization Program for Education 3", room: "SHS-201", teacherName: "Ms. BALUAT", teacherEmail: "baluat@school.edu" },
        { day: "Friday", startTime: "08:45", endTime: "09:45", subject: "Understanding Culture, Society, and Politics", room: "SHS-201", teacherName: "Ms. BIBERA", teacherEmail: "bibera@school.edu" },
        { day: "Friday", startTime: "10:00", endTime: "11:00", subject: "Basic Calculus", room: "SHS-204", teacherName: "Ms. SABAYDAY", teacherEmail: "sabayday@school.edu" },
        { day: "Friday", startTime: "11:00", endTime: "12:00", subject: "Reading and Writing Skills", room: "SHS-203", teacherName: "Ms. NATULLA", teacherEmail: "natulla@school.edu" },
        { day: "Friday", startTime: "13:00", endTime: "14:00", subject: "General Biology 2", room: "SHS-202", teacherName: "Ms. MONTEDERAMOS", teacherEmail: "montederamos@school.edu" },
        { day: "Friday", startTime: "14:00", endTime: "15:00", subject: "General Biology 2", room: "SHS-202", teacherName: "Ms. MONTEDERAMOS", teacherEmail: "montederamos@school.edu" },
      ],
    },
    "ERICKSON-ALBIA": {
      track: "ABM",
      teacherName: "Ms. ALBIA",
      teacherEmail: "albia@school.edu",
      baseSubjects: [
        "Business Ethics and Social Responsibility",
        "Principles of Marketing",
        "Fundamentals of Accountancy, Business, and Management 1",
        "Statistics and Probability",
        "Practical Research 1",
        "Creative Writing",
        "Understanding Culture, Society, and Politics",
      ],
    },
    "DEWEY-G-ONE": {
      track: "ABM",
      teacherName: "Ms. G-ONE",
      teacherEmail: "g-one@school.edu",
      baseSubjects: [
        "Creative Writing",
        "Fundamentals of Accountancy, Business, and Management 1",
        "Principles of Marketing",
        "Reading and Writing Skills",
        "Practical Research 1",
        "Business Ethics and Social Responsibility",
        "Disciplines and Ideas in the Applied Social Sciences",
      ],
    },
    "KANT-SANGUITAN": {
      track: "HUMSS",
      teacherName: "Ms. SANGUITAN",
      teacherEmail: "sanguitan@school.edu",
      baseSubjects: [
        "Statistics and Probability",
        "Reading and Writing Skills",
        "Understanding Culture, Society, and Politics",
        "Practical Research 1",
        "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik",
        "Creative Writing",
        "Disciplines and Ideas in the Applied Social Sciences",
      ],
    },
    "DESCARTES-APDUBAN": {
      track: "HUMSS",
      teacherName: "Ms. APDUBAN",
      teacherEmail: "apduban@school.edu",
      baseSubjects: [
        "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik",
        "Statistics and Probability",
        "Creative Writing",
        "Understanding Culture, Society, and Politics",
        "Practical Research 1",
        "Reading and Writing Skills",
        "Disciplines and Ideas in the Applied Social Sciences",
      ],
    },
    "PHYTAGORAS-MALE X (ALS)": {
      track: "GAS",
      teacherName: "Ms. MALE X (ALS)",
      teacherEmail: "malex@school.edu",
      baseSubjects: [
        "Reading and Writing Skills",
        "Basic Calculus",
        "Health Optimization Program for Education 3",
        "Practical Research 1",
        "Electrical Installation and Maintenance",
        "Statistics and Probability",
        "Understanding Culture, Society, and Politics",
      ],
    },
  };

  const sectionOverride = sectionTrackOverrides[normalizedSection];
  if (sectionOverride) {
    if (sectionOverride.templates) {
      return sectionOverride.templates;
    }

    if (sectionOverride.baseSubjects) {
      return buildTemplatesFromSectionSchedule(sectionName, sectionOverride.baseSubjects);
    }

    return buildSectionFallback(sectionOverride.track, sectionOverride.teacherName, sectionOverride.teacherEmail);
  }

  const templates: Record<string, FallbackTemplate[]> = {
    STEM: [
      { day: "Monday", startTime: "07:45", endTime: "08:45", subject: "Basic Calculus", room: "SHS-201", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Monday", startTime: "10:00", endTime: "11:00", subject: "Physical Science", room: "SHS-204", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Tuesday", startTime: "07:45", endTime: "08:45", subject: "General Biology 2", room: "SHS-202", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Tuesday", startTime: "10:00", endTime: "11:00", subject: "Practical Research 1", room: "SHS-203", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Wednesday", startTime: "07:45", endTime: "08:45", subject: "Health Optimization Program for Education 3", room: "SHS-205", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Wednesday", startTime: "10:00", endTime: "11:00", subject: "Disciplines and Ideas in the Applied Social Sciences", room: "SHS-202", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Thursday", startTime: "07:45", endTime: "08:45", subject: "Basic Calculus", room: "SHS-201", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Thursday", startTime: "10:00", endTime: "11:00", subject: "Physical Science", room: "SHS-204", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Friday", startTime: "07:45", endTime: "08:45", subject: "Practical Research 1", room: "SHS-203", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
    ],
    HUMSS: [
      { day: "Monday", startTime: "07:45", endTime: "08:45", subject: "Reading and Writing Skills", room: "SHS-201", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Monday", startTime: "10:00", endTime: "11:00", subject: "Understanding Culture, Society, and Politics", room: "SHS-204", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Tuesday", startTime: "07:45", endTime: "08:45", subject: "Pagbasa at Pagsusuri ng Iba't Ibang Teksto Tungo sa Pananaliksik", room: "SHS-202", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Tuesday", startTime: "10:00", endTime: "11:00", subject: "Practical Research 1", room: "SHS-203", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Wednesday", startTime: "07:45", endTime: "08:45", subject: "Disciplines and Ideas in the Applied Social Sciences", room: "SHS-205", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Wednesday", startTime: "10:00", endTime: "11:00", subject: "Creative Writing", room: "SHS-202", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Thursday", startTime: "07:45", endTime: "08:45", subject: "Reading and Writing Skills", room: "SHS-201", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Friday", startTime: "07:45", endTime: "08:45", subject: "Understanding Culture, Society, and Politics", room: "SHS-204", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
    ],
    ABM: [
      { day: "Monday", startTime: "07:45", endTime: "08:45", subject: "Fundamentals of Accountancy, Business, and Management 1", room: "SHS-201", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Monday", startTime: "10:00", endTime: "11:00", subject: "Principles of Marketing", room: "SHS-204", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Tuesday", startTime: "07:45", endTime: "08:45", subject: "Business Ethics and Social Responsibility", room: "SHS-202", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Tuesday", startTime: "10:00", endTime: "11:00", subject: "Creative Writing", room: "SHS-203", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Wednesday", startTime: "07:45", endTime: "08:45", subject: "Disciplines and Ideas in the Applied Social Sciences", room: "SHS-205", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Thursday", startTime: "07:45", endTime: "08:45", subject: "Fundamentals of Accountancy, Business, and Management 1", room: "SHS-201", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Friday", startTime: "07:45", endTime: "08:45", subject: "Principles of Marketing", room: "SHS-204", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
    ],
    GAS: [
      { day: "Monday", startTime: "07:45", endTime: "08:45", subject: "Statistics and Probability", room: "SHS-201", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Monday", startTime: "10:00", endTime: "11:00", subject: "Health Optimization Program for Education 3", room: "SHS-204", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Tuesday", startTime: "07:45", endTime: "08:45", subject: "Reading and Writing Skills", room: "SHS-202", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Tuesday", startTime: "10:00", endTime: "11:00", subject: "Understanding Culture, Society, and Politics", room: "SHS-203", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Wednesday", startTime: "07:45", endTime: "08:45", subject: "Practical Research 1", room: "SHS-205", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Thursday", startTime: "07:45", endTime: "08:45", subject: "Basic Calculus", room: "SHS-201", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
      { day: "Friday", startTime: "07:45", endTime: "08:45", subject: "Creative Writing", room: "SHS-204", teacherName: defaultTeacherName, teacherEmail: defaultTeacherEmail },
    ],
  };

  return templates[track] ?? templates.STEM;
}

function findTimeSlot(timeSlots: TimeSlotItem[], day: string, startTime: string, endTime: string) {
  return timeSlots.find(
    (slot) => slot.day === day && slot.startTime === startTime && slot.endTime === endTime
  );
}

async function buildFallbackStudentSchedule(student: { section: { name: string; track: string } }) {
  const allTimeSlots = await prisma.timeSlot.findMany();
  const subjects = await prisma.subject.findMany({ where: { gradeLevel: "G11" } });
  const subjectMap = new Map(subjects.map((subject) => [subject.name, subject]));
  // Prefer image-prefill templates if available for this section
  const imageEntries = findImagePrefillEntries(student.section.name);
  let templates = [] as FallbackTemplate[];
  if (imageEntries && imageEntries.length > 0) {
    templates = imageEntries.map((e) => {
      const slot = sectionSlotTimes.find((s) => s.startTime === e.startTime) || sectionSlotTimes[0];
      return {
        day: e.day,
        startTime: e.startTime,
        endTime: slot.endTime,
        subject: e.label,
        room: subjectRoomMap[e.label] || "SHS-201",
        teacherName: `Ms. ${student.section.name.split(/[-\s]+/)[0] || "Teacher"}`,
        teacherEmail: `${student.section.name.split(/[-\s]+/)[0].toLowerCase()}@school.edu`,
      };
    });
  } else {
    templates = getFallbackTemplates(student.section.track, student.section.name);
  }
  // Inject fixed break templates (RECESS and LUNCH) for Mon-Fri so students see them
  const breakTemplates: FallbackTemplate[] = sectionDays.flatMap((day) => [
    { day, startTime: "09:45", endTime: "10:00", subject: "RECESS", room: null as any, teacherName: "", teacherEmail: "" },
    { day, startTime: "12:00", endTime: "13:00", subject: "LUNCH BREAK", room: null as any, teacherName: "", teacherEmail: "" },
  ]);

  // Merge and keep original templates first
  templates = [...templates, ...breakTemplates];

  return templates.map((template, index) => {
    const timeSlot = findTimeSlot(allTimeSlots, template.day, template.startTime, template.endTime);
    const normalizedSubject = normalizeSubjectName(template.subject);
    const subject = subjectMap.get(normalizedSubject) ?? {
      id: `fallback-${normalizedSubject}`,
      name: normalizedSubject,
      gradeLevel: "G11",
      track: student.section.track,
    };

    return {
      id: `fallback-${student.section.name}-${index}`,
      subject,
      timeSlot: timeSlot ?? {
        id: `fallback-${template.day}-${template.startTime}-${template.endTime}`,
        day: template.day,
        startTime: template.startTime,
        endTime: template.endTime,
      },
      room: template.room,
      teacher: {
        id: `fallback-${student.section.name}`,
        user: {
          name: template.teacherName,
          email: template.teacherEmail,
        },
      },
    };
  });
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "TEACHER" && session.user.role !== "STUDENT") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    // Handle Student Request
    if (session.user.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: session.user.id },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          section: true,
        },
      });

      if (!student) {
        return NextResponse.json({ message: "Student not found" }, { status: 404 });
      }

      let schedule = await prisma.scheduleBlock.findMany({
        where: {
          sectionId: student.sectionId,
        },
        include: {
          subject: {
            select: {
              id: true,
              name: true,
              gradeLevel: true,
              track: true,
            },
          },
          timeSlot: {
            select: {
              id: true,
              day: true,
              startTime: true,
              endTime: true,
            },
          },
          teacher: {
            select: {
              id: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: [
          { timeSlot: { day: "asc" } },
          { timeSlot: { startTime: "asc" } },
        ],
      });

      // also include canonical time slots so clients can render a full grid
      const allTimeSlots = await prisma.timeSlot.findMany({ orderBy: [{ day: "asc" }, { startTime: "asc" }] });

      const isPrefillSection = student.gradeLevel === "G11" && findImagePrefillEntries(student.section.name).length > 0;
      if (schedule.length === 0 || isPrefillSection) {
        schedule = await buildFallbackStudentSchedule(student);
      }

      return NextResponse.json({
        studentId: student.studentId,
        name: student.user.name,
        email: student.user.email,
        gradeLevel: student.gradeLevel,
        section: student.section,
        dateOfBirth: student.dateOfBirth?.toISOString().split("T")[0] ?? null,
        gender: student.gender,
        phone: student.phone,
        address: student.address,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        schedule,
        timeSlots: allTimeSlots,
      });
    }

    // Handle Teacher Request
    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: {
        scheduleBlocks: {
          include: {
            subject: true,
            timeSlot: true,
            section: true,
          },
        },
      },
    });

    const allTimeSlots = await prisma.timeSlot.findMany();

    const baseSchedule: ScheduleItem[] =
      teacher?.scheduleBlocks.map((block) => ({
        day: block.timeSlot.day,
        timeSlot: `${formatTimeForDisplay(block.timeSlot.startTime)}-${formatTimeForDisplay(block.timeSlot.endTime)}`,
        subject: block.subject.name,
        section: block.section.name,
        room: block.room,
      })) ?? [];

    const scheduleBreaks: ScheduleItem[] = [
      ...DAYS.flatMap((day) => [
        {
          day,
          timeSlot: `${formatTimeForDisplay("09:45")}-${formatTimeForDisplay("10:00")}`,
          subject: "RECESS",
          section: "",
          room: null,
        },
        {
          day,
          timeSlot: `${formatTimeForDisplay("12:00")}-${formatTimeForDisplay("13:00")}`,
          subject: "LUNCH BREAK",
          section: "",
          room: null,
        },
      ]),
    ];

    const schedule: ScheduleItem[] = [...baseSchedule, ...scheduleBreaks];

    const sourceTimeSlots =
      allTimeSlots.length > 0
        ? allTimeSlots.map((slot) => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
          }))
        : teacher?.scheduleBlocks.map((block) => ({
            startTime: block.timeSlot.startTime,
            endTime: block.timeSlot.endTime,
          })) ?? [];

    const breakSlots: TimeSlotItem[] = [
      { startTime: "09:45", endTime: "10:00" },
      { startTime: "12:00", endTime: "13:00" },
    ];

    const allSourceSlots = [...sourceTimeSlots, ...breakSlots];

    const uniqueSlots = new Map<string, TimeSlotItem>();
    for (const slot of allSourceSlots) {
      const key = `${slot.startTime}-${slot.endTime}`;
      if (!uniqueSlots.has(key)) {
        uniqueSlots.set(key, {
          startTime: formatTimeForDisplay(slot.startTime),
          endTime: formatTimeForDisplay(slot.endTime),
        });
      }
    }

    const timeSlots = Array.from(uniqueSlots.values()).sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );

    return NextResponse.json({
      teacher: teacher
        ? {
            id: teacher.id,
            name: teacher.user.name,
            email: teacher.user.email,
            dateOfBirth: teacher.dateOfBirth?.toISOString().split("T")[0] ?? null,
            gender: teacher.gender,
            phone: teacher.phone,
            address: teacher.address,
          }
        : null,
      schedule,
      timeSlots,
      source: "database",
    });
  } catch {
    return NextResponse.json(
      { schedule: demoSchedule, timeSlots: demoTimeSlots, source: "demo" },
      { status: 200 }
    );
  }
}