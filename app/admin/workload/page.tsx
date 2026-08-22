"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface TeacherWorkload {
  teacherId: string;
  teacherName: string;
  periods: number;
  subjects: string[];
  sections: string[];
  workloadPercentage: number;
  status: "underloaded" | "balanced" | "overloaded";
}

export default function WorkloadReportPage() {
  const router = useRouter();
  const [workloads, setWorkloads] = useState<TeacherWorkload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkloads();
  }, []);

  async function loadWorkloads() {
    try {
      const response = await fetch("/api/admin/workload");
      if (response.ok) {
        setWorkloads(await response.json());
      }
    } catch (error) {
      console.error("Failed to load workloads:", error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "underloaded":
        return "bg-blue-900/20 border-blue-700 text-blue-300";
      case "balanced":
        return "bg-green-900/20 border-green-700 text-green-300";
      case "overloaded":
        return "bg-red-900/20 border-red-700 text-red-300";
      default:
        return "bg-slate-800 border-slate-700 text-slate-300";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "underloaded":
        return "⬇️ Underloaded";
      case "balanced":
        return "✅ Balanced";
      case "overloaded":
        return "⬆️ Overloaded";
      default:
        return "Unknown";
    }
  };

  const avgPeriods = workloads.length > 0 ? Math.round(workloads.reduce((a, b) => a + b.periods, 0) / workloads.length) : 0;

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
          <h1 className="text-4xl font-bold text-white mb-2">Teacher Workload Report</h1>
          <p className="text-slate-400">Analyze class distribution and teacher load balance</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Total Teachers</div>
            <div className="text-3xl font-bold text-white">{workloads.length}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-1">Avg Load</div>
            <div className="text-3xl font-bold text-white">{avgPeriods}</div>
            <div className="text-xs text-slate-500 mt-1">periods/week</div>
          </div>
          <div className="bg-green-900/20 border border-green-700 rounded-xl p-4">
            <div className="text-sm text-green-300 mb-1">Balanced</div>
            <div className="text-3xl font-bold text-green-400">
              {workloads.filter((w) => w.status === "balanced").length}
            </div>
          </div>
          <div className="bg-red-900/20 border border-red-700 rounded-xl p-4">
            <div className="text-sm text-red-300 mb-1">Issue</div>
            <div className="text-3xl font-bold text-red-400">
              {workloads.filter((w) => w.status !== "balanced").length}
            </div>
          </div>
        </div>

        {/* Workload Details */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading workload data...</div>
          ) : workloads.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No teachers with schedules yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900">
                    <th className="px-6 py-3 text-left font-semibold text-slate-300">Teacher</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-300">Periods/Week</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-300">Subjects</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-300">Sections</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-300">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workloads
                    .sort((a, b) => b.periods - a.periods)
                    .map((workload) => (
                      <tr key={workload.teacherId} className="border-b border-slate-700 hover:bg-slate-700/50">
                        <td className="px-6 py-3 font-medium text-white">{workload.teacherName}</td>
                        <td className="px-6 py-3 text-white text-lg font-semibold">{workload.periods}</td>
                        <td className="px-6 py-3 text-slate-300">
                          <div className="flex flex-wrap gap-1">
                            {workload.subjects.slice(0, 3).map((subject, idx) => (
                              <span key={idx} className="px-2 py-1 bg-indigo-900/50 text-indigo-300 rounded text-xs">
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
                        <td className="px-6 py-3 text-slate-300">
                          <div className="flex flex-wrap gap-1">
                            {workload.sections.slice(0, 2).map((section, idx) => (
                              <span key={idx} className="px-2 py-1 bg-violet-900/50 text-violet-300 rounded text-xs">
                                {section}
                              </span>
                            ))}
                            {workload.sections.length > 2 && (
                              <span className="px-2 py-1 bg-slate-700 text-slate-400 rounded text-xs">
                                +{workload.sections.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(workload.status)}`}>
                            {getStatusLabel(workload.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="bg-blue-900/20 border border-blue-700 rounded-xl p-4">
            <div className="text-blue-300 font-semibold mb-1">⬇️ Underloaded</div>
            <p className="text-sm text-slate-400">Less than 18 periods/week. Consider adding more classes.</p>
          </div>
          <div className="bg-green-900/20 border border-green-700 rounded-xl p-4">
            <div className="text-green-300 font-semibold mb-1">✅ Balanced</div>
            <p className="text-sm text-slate-400">18-24 periods/week. Optimal teacher workload.</p>
          </div>
          <div className="bg-red-900/20 border border-red-700 rounded-xl p-4">
            <div className="text-red-300 font-semibold mb-1">⬆️ Overloaded</div>
            <p className="text-sm text-slate-400">More than 24 periods/week. May cause burnout.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
