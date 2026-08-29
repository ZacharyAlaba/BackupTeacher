"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import {
  Users,
  GraduationCap,
  BookOpen,
  Building2,
  Clock,
  Download,
  Upload,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

interface ImportResult {
  message: string;
  imported: { teachers: number; subjects: number; sections: number; timeSlots: number; schedules: number };
  skipped: { constraints: number; policy: number };
}

const categories: { label: string; description: string; href: string; icon: LucideIcon; color: string }[] = [
  { label: "Teachers", description: "Add, edit or bulk import teacher records", href: "/admin/teachers", icon: Users, color: "text-green-400 bg-green-500/20 border-green-500/30" },
  { label: "Students", description: "Add, edit or bulk import student records", href: "/admin/students", icon: GraduationCap, color: "text-cyan-400 bg-cyan-500/20 border-cyan-500/30" },
  { label: "Subjects", description: "Manage the subject curriculum", href: "/admin/subjects", icon: BookOpen, color: "text-purple-400 bg-purple-500/20 border-purple-500/30" },
  { label: "Sections", description: "Manage class sections and grade levels", href: "/admin/sections", icon: Building2, color: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30" },
  { label: "Time Slots", description: "Manage the daily class time slots", href: "/admin/time-slots", icon: Clock, color: "text-indigo-400 bg-indigo-500/20 border-indigo-500/30" },
];

export default function DataManagementPage() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    try {
      const response = await fetch("/api/admin/export");
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `schedule_export_${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export data:", error);
      setImportError("Failed to export data");
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);
    setImportError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/import", { method: "POST", body: formData });
      const result = await response.json();
      if (response.ok) {
        setImportResult(result);
      } else {
        setImportError(result.error || "Failed to import data");
      }
    } catch (error) {
      console.error("Failed to import data:", error);
      setImportError("Failed to import data");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  }

  return (
    <>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">SYSTEM</p>
        <h1 className="text-3xl font-bold text-white light:text-slate-900">Data Management</h1>
        <p className="text-sm text-slate-400 mt-2 light:text-slate-600">Back up your whole schedule to a CSV file, restore it, or jump into a category to manage its records.</p>
      </div>

      {/* Full system backup / restore */}
      <div className="mb-8 rounded-lg border border-slate-700 bg-slate-800/50 p-6 light:border-slate-200 light:bg-white">
        <h2 className="text-lg font-semibold text-white mb-1 light:text-slate-900">System Backup</h2>
        <p className="text-sm text-slate-400 mb-4 light:text-slate-600">Export every teacher, subject, section, time slot and schedule to a single CSV file, or restore from one.</p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2.5 text-sm font-medium text-white transition-all"
          >
            <Download className="h-4 w-4" />
            {exporting ? "Exporting..." : "Export All Data"}
          </button>

          <label className="flex items-center gap-2 rounded-lg border border-slate-600 hover:border-slate-500 px-4 py-2.5 text-sm font-medium text-slate-200 transition-all cursor-pointer light:border-slate-300 light:text-slate-700 light:hover:border-slate-400">
            <Upload className="h-4 w-4" />
            {importing ? "Importing..." : "Import Data"}
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
        </div>

        {importError && (
          <p className="mt-4 text-sm text-red-400">{importError}</p>
        )}

        {importResult && (
          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/50 p-4">
            <p className="text-sm font-medium text-green-400 mb-2">{importResult.message}</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm text-slate-300">
              <p>Teachers: <span className="text-white font-semibold">{importResult.imported.teachers}</span></p>
              <p>Subjects: <span className="text-white font-semibold">{importResult.imported.subjects}</span></p>
              <p>Sections: <span className="text-white font-semibold">{importResult.imported.sections}</span></p>
              <p>Time Slots: <span className="text-white font-semibold">{importResult.imported.timeSlots}</span></p>
              <p>Schedules: <span className="text-white font-semibold">{importResult.imported.schedules}</span></p>
            </div>
          </div>
        )}
      </div>

      {/* Per-category management */}
      <h2 className="text-lg font-semibold text-white mb-4 light:text-slate-900">Manage by Category</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <button
            key={category.href}
            onClick={() => router.push(category.href)}
            className="group flex items-start gap-4 rounded-lg border border-slate-700 bg-slate-800/50 p-5 text-left hover:bg-slate-800 transition-all light:border-slate-200 light:bg-white light:hover:bg-slate-50"
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${category.color}`}>
              <category.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="admin-category-label font-medium">{category.label}</p>
              <p className="text-sm text-slate-400 mt-1 light:text-slate-600">{category.description}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500 mt-1 group-hover:translate-x-0.5 transition-transform light:text-slate-400" />
          </button>
        ))}
      </div>
    </>
  );
}
