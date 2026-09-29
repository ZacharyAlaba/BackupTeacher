"use client";

import { findImagePrefillEntries } from "@/lib/imagePrefill";

interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface ScheduleItem {
  day: string;
  timeSlot: string;
  subject: string;
  section: string;
  room?: string | null;
}

interface TimetableProps {
  schedule: ScheduleItem[];
  timeSlots: TimeSlot[];
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function Timetable({ schedule, timeSlots }: TimetableProps) {
  const uniqueTimeSlots = Array.from(
    new Map(timeSlots.map((slot) => [`${slot.startTime}-${slot.endTime}`, slot])).values()
  );

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
      return Number(hhmm[1]) * 60 + Number(hhmm[2]);
    }
    return 0;
  }

  // ensure there's a 17:00-18:00 slot (5:00-6:00) at the end if missing
  const slots = [...uniqueTimeSlots];
  slots.sort((a, b) => parseToMinutes(a.startTime) - parseToMinutes(b.startTime));
  const hasFiveToSixSlot = slots.some((slot) => parseToMinutes(slot.startTime) === 17 * 60);
  if (!hasFiveToSixSlot) {
    slots.push({ startTime: "17:00", endTime: "18:00" });
    slots.sort((a, b) => parseToMinutes(a.startTime) - parseToMinutes(b.startTime));
  }

  function formatDisplayTime(value: string) {
    if (!value) return "";
    const normalized = value.trim();
    // already contains AM/PM
    if (/AM|PM/i.test(normalized)) {
      const m = normalized.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
      if (!m) return normalized;
      const hour = Number(m[1]) % 12 || 12;
      const minute = m[2];
      return `${hour}:${minute}`;
    }
    // if 24h hh:mm
    const hhmm = normalized.match(/^(\d{1,2}):(\d{2})$/);
    if (hhmm) {
      let hour = Number(hhmm[1]);
      const minute = hhmm[2];
      // convert to 12-hour without AM/PM
      hour = hour % 12 || 12;
      return `${hour}:${minute}`;
    }
    return normalized;
  }

  function normalizeSubjectLabel(name: string) {
    return (name || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }

  function getSubjectDisplayLabel(subjectName: string) {
    const normalized = normalizeSubjectLabel(subjectName);
    const shortcutMap: Record<string, string> = {
      PRACTICALRESEARCH1: "PR",
      PR1: "PR",
      READINGANDWRITINGSKILLS: "READING & WRITING",
      READINGANDWRITING: "READING & WRITING",
      READING: "READING & WRITING",
      STATISTICSANDPROBABILITY: "STAT",
      PHYSICALSCIENCE: "PhySci",
      ELECTRICALINSTALLATIONANDMAINTENANCE: "EIM",
      HEALTHOPTIMIZATIONPROGRAMFOREDUCATION3: "HOPE",
      HOPEF: "HOPE",
      HOPF: "HOPE",
      DISASTERREADINESSANDRISKREDUCTION: "DRRR",
      BEAUTYNAILANDCULTURE: "BNC",
      HOUSEKEEPING: "HOUSEKEEPING",
      FUNDAMENTALSOFACCOUNTANCYBUSINESSANDMANAGEMENT1: "FABM1",
      FABM1: "FABM1",
      PRINCIPLESOFMARKETING: "PM",
      BUSINESSETHICSANDSOCIALRESPONSIBILITY: "BESR",
      CREATIVEWRITING: "CW",
      UNDERSTANDINGCULTURESOCIETYANDPOLITICS: "UCSP",
      UCSP: "UCSP",
    };

    return shortcutMap[normalized] || subjectName;
  }

  const getScheduleItem = (day: string, timeSlot: string) => {
    return schedule.find(
      (item) => item.day === day && item.timeSlot === timeSlot
    );
  };

  return (
    <div className="w-full overflow-hidden">
      <div className="w-full align-middle">
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-lg shadow-slate-950/40 light:border-slate-200 light:bg-white light:shadow-slate-200/50">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 w-20 border border-slate-700 bg-slate-900 px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-100 light:border-slate-200 light:bg-slate-100 light:text-slate-700"
                >
                  Time
                </th>
                {DAYS.map((day) => (
                  <th
                    key={day}
                    scope="col"
                    className="border border-slate-700 bg-slate-900 px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-100 light:border-slate-200 light:bg-slate-100 light:text-slate-700"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot, index) => {
                const timeSlotKey = `${slot.startTime}-${slot.endTime}`;
                return (
                  <tr
                    key={timeSlotKey}
                    className={index % 2 === 0 ? "bg-slate-950 light:bg-white" : "bg-slate-900 light:bg-slate-50"}
                  >
                      <td className="sticky left-0 z-10 w-20 whitespace-nowrap border border-slate-700 bg-slate-900 px-2 py-2 text-[10px] font-semibold text-slate-200 light:border-slate-200 light:bg-slate-100 light:text-slate-700">
                      <div className="flex flex-col">
                        <span>{formatDisplayTime(slot.startTime)}</span>
                        <span className="text-[10px] font-medium text-slate-500 light:text-slate-400">to</span>
                        <span>{formatDisplayTime(slot.endTime)}</span>
                      </div>
                    </td>

                      {DAYS.map((day) => {
                      const item = getScheduleItem(day, timeSlotKey);
                      const breakItem = DAYS
                        .map((breakDay) => getScheduleItem(breakDay, timeSlotKey))
                        .find((scheduleItem) => scheduleItem?.subject?.toUpperCase().includes("RECESS") || scheduleItem?.subject?.toUpperCase().includes("LUNCH"));

                      if (breakItem) {
                        if (day !== DAYS[0]) return null;

                        return (
                          <td
                            key={`break-${timeSlotKey}`}
                            colSpan={DAYS.length}
                            className="h-16 border border-slate-700 px-1 py-1 align-top light:border-slate-200"
                          >
                            <div className="flex h-full w-full items-center justify-center rounded-xl bg-rose-300 p-2 text-xs font-semibold text-black">
                              {breakItem.subject}
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={`${day}-${timeSlotKey}`}
                          className="h-16 border border-slate-700 px-1 py-1 align-top light:border-slate-200"
                        >
                              {item ? (
                                // determine if this item is a break or has a prefills style
                                (() => {
                                  const isBreak = item.subject?.toUpperCase().includes("RECESS") || item.subject?.toUpperCase().includes("LUNCH");
                                  // try to find a matching prefill entry for styling
                                  const prefillList = findImagePrefillEntries(item.section || "") || [];
                                  const slotStart = slot.startTime;
                                  const matchedPrefill = prefillList.find((p) => p.day === item.day && p.startTime === slotStart);

                                  const tileBg = matchedPrefill?.bg || (isBreak ? "bg-rose-300" : "bg-slate-800 light:bg-slate-100");
                                  const tileText = matchedPrefill?.textColor || (isBreak ? "text-black" : "text-slate-100 light:text-slate-800");
                                  const displaySubject = getSubjectDisplayLabel(item.subject);

                                  // non-clickable for breaks
                                  if (isBreak) {
                                    return (
                                      <div className={`w-full h-full rounded-xl ${tileBg} ${tileText} p-2 flex flex-col justify-center items-center text-xs font-semibold leading-tight cursor-default`}>
                                        <div>{item.subject}</div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className={`h-full rounded-xl border border-slate-700 light:border-slate-200 ${tileBg} p-2 shadow-sm shadow-slate-950/20 light:shadow-slate-200/50 flex flex-col justify-between`}> 
                                      <div>
                                        <div className={`mb-1 text-xs font-semibold leading-tight ${tileText}`}>
                                          {displaySubject}
                                        </div>
                                        <div className="text-[10px] font-medium text-slate-300 light:text-slate-600">
                                          {item.section}
                                        </div>
                                        {item.room && (
                                          <div className="mt-1 inline-block rounded bg-slate-900 px-1 py-0.5 text-[10px] text-slate-300 light:bg-slate-200 light:text-slate-700">
                                            Room {item.room}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()
                              ) : (
                                <div className="flex h-full items-center justify-center text-[10px] text-slate-500 light:text-slate-400">
                                  Free
                                </div>
                              )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
