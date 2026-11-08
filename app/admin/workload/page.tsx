"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface TeacherWorkload {
  teacherId: string;
  teacherName: string;
  periods: number;
  subjects: string[];
  sections: string[];
}

export default function WorkloadReportPage() {
  const router = useRouter();
  const [workloads, setWorkloads] = useState<TeacherWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadWorkloads();
  }, []);

  async function loadWorkloads() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/workload", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load workload report");
      }

      setWorkloads(data);
    } catch (error) {
      console.error("Failed to load workloads:", error);
      setError(error instanceof Error ? error.message : "Failed to load workload report");
    } finally {
      setLoading(false);
    }
  }

  const avgPeriods = workloads.length > 0 ? Math.round(workloads.reduce((a, b) => a + b.periods, 0) / workloads.length) : 0;
  const assignedSubjectCount = new Set(workloads.flatMap((workload) => workload.subjects)).size;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 light:bg-none light:bg-slate-100 sm:p-8">
      <div className="w-full">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 rounded-lg bg-slate-700 px-3 py-1 text-sm text-slate-300 hover:bg-slate-600 light:bg-slate-200 light:text-slate-800 light:hover:bg-slate-300"
          >
            ← Back
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Teacher Workload Report</h1>
          <p className="text-slate-400">Analyze class distribution and teacher load balance</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 light:border-slate-300 light:bg-white">
            <div className="text-sm text-slate-400 mb-1">Total Teachers</div>
            <div className="text-3xl font-bold text-white">{workloads.length}</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 light:border-slate-300 light:bg-white">
            <div className="text-sm text-slate-400 mb-1">Avg Load</div>
            <div className="text-3xl font-bold text-white">{avgPeriods}</div>
            <div className="text-xs text-slate-500 mt-1">periods/week</div>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-4 light:border-slate-300 light:bg-white">
            <div className="text-sm text-slate-400 mb-1">Subjects Assigned</div>
            <div className="text-3xl font-bold text-white">{assignedSubjectCount}</div>
          </div>
        </div>

        {/* Workload Details */}
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800 light:border-slate-300 light:bg-white">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading workload data...</div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 p-8 text-center">
              <p className="text-red-300 light:text-red-700">{error}</p>
              <button
                type="button"
                onClick={loadWorkloads}
                className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700"
              >
                Retry
              </button>
            </div>
          ) : workloads.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No teachers with schedules yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900 light:border-slate-300 light:bg-slate-100">
                    <th className="px-6 py-3 text-left font-semibold text-slate-300 light:text-slate-800">Teacher</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-300 light:text-slate-800">Periods/Week</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-300 light:text-slate-800">Subjects</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-300 light:text-slate-800">Sections</th>
                  </tr>
                </thead>
                <tbody>
                  {workloads
                    .sort((a, b) => b.periods - a.periods)
                    .map((workload) => (
                      <tr key={workload.teacherId} className="border-b border-slate-700 hover:bg-slate-700/50 light:border-slate-200 light:bg-white light:hover:bg-slate-50">
                        <td className="px-6 py-3 font-medium text-white light:text-slate-900">{workload.teacherName}</td>
                        <td className="px-6 py-3 text-lg font-semibold text-white light:text-slate-900">{workload.periods}</td>
                        <td className="px-6 py-3 text-slate-300 light:text-slate-700">
                          <div className="flex flex-wrap gap-1">
                            {workload.subjects.slice(0, 3).map((subject, idx) => (
                              <span key={idx} className="rounded border border-indigo-500/40 bg-indigo-900/50 px-2 py-1 text-xs font-medium text-indigo-300 light:border-indigo-200 light:bg-indigo-50 light:text-indigo-900">
                                {subject}
                              </span>
                            ))}
                            {workload.subjects.length > 3 && (
                              <span className="px-2 py-1 bg-slate-700 text-slate-400 rounded text-xs">
                                +{workload.subjects.length - 3} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-slate-300 light:text-slate-700">
                          <div className="flex flex-wrap gap-1">
                            {workload.sections.slice(0, 2).map((section, idx) => (
                              <span key={idx} className="rounded border border-violet-500/40 bg-violet-900/50 px-2 py-1 text-xs font-semibold text-violet-300 light:border-violet-300 light:bg-violet-100 light:text-violet-900">
                                {section}
                              </span>
                            ))}
                            {workload.sections.length > 2 && (
                              <span className="rounded border border-slate-600 bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-200 light:border-slate-300 light:bg-slate-100 light:text-slate-700">
                                +{workload.sections.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
