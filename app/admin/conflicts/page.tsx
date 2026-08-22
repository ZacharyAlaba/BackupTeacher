"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ConflictSchedule {
  id: string;
  teacher: string;
  subject: string;
  section: string;
  time: string;
}

interface Conflict {
  type: "TEACHER_CONFLICT" | "SECTION_CONFLICT";
  description: string;
  schedules: ConflictSchedule[];
}

interface Warning {
  type: "OVERLOAD_WARNING";
  description: string;
  teacherId: string;
  periods: number;
}

interface ConflictData {
  conflicts: Conflict[];
  warnings: Warning[];
  totalSchedules: number;
  affectedTeachers: number;
}

export default function ConflictResolutionPage() {
  const router = useRouter();
  const [data, setData] = useState<ConflictData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConflicts();
    const interval = setInterval(loadConflicts, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function loadConflicts() {
    try {
      const response = await fetch("/api/admin/conflicts");
      if (response.ok) {
        setData(await response.json());
      }
    } catch (error) {
      console.error("Failed to load conflicts:", error);
    } finally {
      setLoading(false);
    }
  }

  async function resolveConflict(scheduleId: string) {
    // Navigate to schedule editor
    router.push(`/admin/schedule-builder`);
  }

  const hasIssues = data && (data.conflicts.length > 0 || data.warnings.length > 0);

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
          <h1 className="text-4xl font-bold text-white mb-2">Conflict Detection & Resolution</h1>
          <p className="text-slate-400">Identify and fix schedule conflicts automatically</p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Total Schedules</div>
            <div className="text-3xl font-bold text-white">{data?.totalSchedules || 0}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Teachers with Classes</div>
            <div className="text-3xl font-bold text-white">{data?.affectedTeachers || 0}</div>
          </div>
          <div
            className={`border rounded-xl p-4 ${
              hasIssues ? "bg-red-900/30 border-red-700" : "bg-green-900/30 border-green-700"
            }`}
          >
            <div className="text-sm mb-1">
              {hasIssues ? (
                <span className="text-red-300">Conflicts Found</span>
              ) : (
                <span className="text-green-300">No Conflicts</span>
              )}
            </div>
            <div className={`text-3xl font-bold ${hasIssues ? "text-red-400" : "text-green-400"}`}>
              {(data?.conflicts.length || 0) + (data?.warnings.length || 0)}
            </div>
          </div>
        </div>

        {/* Conflicts Section */}
        {data?.conflicts && data.conflicts.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">🚨 Schedule Conflicts</h2>
            <div className="space-y-4">
              {data.conflicts.map((conflict, idx) => (
                <div key={idx} className="bg-red-900/20 border border-red-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-red-300 mb-4">{conflict.description}</h3>
                  <p className="text-sm text-slate-300 mb-4">Type: {conflict.type}</p>
                  
                  <div className="space-y-2 mb-4">
                    {conflict.schedules.map((schedule, schedIdx) => (
                      <div key={schedIdx} className="bg-slate-800 rounded p-3 text-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-white">{schedule.teacher}</div>
                            <div className="text-slate-400">{schedule.subject} - {schedule.section}</div>
                            <div className="text-slate-500 text-xs mt-1">{schedule.time}</div>
                          </div>
                          <button
                            onClick={() => resolveConflict(schedule.id)}
                            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-yellow-900/30 border border-yellow-700 rounded p-3 text-sm text-yellow-200">
                    <strong>Fix:</strong> Remove or reschedule one of the conflicting classes to a different time slot.
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Warnings Section */}
        {data?.warnings && data.warnings.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">⚠️ Teacher Workload Warnings</h2>
            <div className="space-y-4">
              {data.warnings.map((warning, idx) => (
                <div key={idx} className="bg-yellow-900/20 border border-yellow-700 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-yellow-300 mb-2">{warning.description}</h3>
                  <p className="text-sm text-slate-300">
                    This teacher has {warning.periods} class periods. Consider if this is sustainable.
                  </p>
                  <button
                    onClick={() => router.push(`/admin/schedule-builder`)}
                    className="mt-4 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm"
                  >
                    Review Schedule →
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Success State */}
        {!hasIssues && !loading && (
          <section className="bg-green-900/20 border border-green-700 rounded-xl p-8 text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-300 mb-2">Perfect Schedule!</h2>
            <p className="text-green-200">
              No conflicts detected. All teachers have clean schedules with no overlaps.
            </p>
          </section>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center text-slate-400 py-12">
            Scanning for conflicts...
          </div>
        )}
      </div>
    </div>
  );
}
