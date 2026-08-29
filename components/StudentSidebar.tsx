"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ClipboardCheck, KeyRound, LayoutDashboard, LogOut, Moon, Pencil, Sun } from "lucide-react";
import { signOut } from "next-auth/react";

type StudentSidebarProps = {
  studentName: string;
  studentId: string;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onEditProfile: () => void;
  onChangePassword: () => void;
};

export default function StudentSidebar({
  studentName,
  studentId,
  theme,
  onToggleTheme,
  onEditProfile,
  onChangePassword,
}: StudentSidebarProps) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-6 w-64 rounded-lg border border-slate-700 bg-slate-800 p-4 light:border-slate-200 light:bg-white">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white">
            <Image src="/images/logo.jpg" alt="Libertad NHS Logo" width={32} height={32} className="object-cover" />
          </div>
          <span className="text-xs font-semibold text-slate-300 light:text-slate-700">Student Portal</span>
        </div>

        <div className="mb-6 rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 light:border-slate-200 light:bg-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 light:text-slate-500">Student</p>
          <p className="mt-1 truncate text-sm font-medium text-white light:text-slate-900">{studentName}</p>
          <p className="mt-1 text-xs text-slate-400 light:text-slate-500">ID: {studentId}</p>
        </div>

        <div className="mb-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 light:text-slate-500">Navigation</p>
          <nav className="space-y-1">
            <Link href="/student" className="flex items-center gap-3 rounded-lg bg-slate-700/50 px-3 py-2.5 text-sm font-medium text-white light:bg-slate-200 light:text-slate-900">
              <LayoutDashboard className="h-4 w-4 text-cyan-400" />
              Dashboard
            </Link>
            <Link href="/student/attendance" className="flex items-center gap-3 rounded-lg bg-slate-700/50 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-700/50 light:bg-slate-200 light:text-slate-800 light:hover:bg-slate-300">
              <ClipboardCheck className="h-4 w-4 text-emerald-400" />
              Attendance
            </Link>
            <Link href="/student#weekly-schedule" className="flex items-center gap-3 rounded-lg bg-slate-700/50 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-700/50 light:bg-slate-200 light:text-slate-800 light:hover:bg-slate-300">
              <CalendarDays className="h-4 w-4 text-indigo-400" />
              Weekly Schedule
            </Link>
          </nav>
        </div>

        <div className="border-t border-slate-700 pt-4 light:border-slate-200">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 light:text-slate-500">Settings</p>
          <div className="space-y-1">
            <button onClick={onEditProfile} className="flex w-full items-center gap-3 rounded-lg bg-slate-700/50 px-3 py-2.5 text-left text-sm font-medium text-slate-200 transition hover:bg-slate-700/50 light:bg-slate-200 light:text-slate-800 light:hover:bg-slate-300">
              <Pencil className="h-4 w-4 text-slate-400" />
              My Profile
            </button>
            <button onClick={onChangePassword} className="flex w-full items-center gap-3 rounded-lg bg-slate-700/50 px-3 py-2.5 text-left text-sm font-medium text-slate-200 transition hover:bg-slate-700/50 light:bg-slate-200 light:text-slate-800 light:hover:bg-slate-300">
              <KeyRound className="h-4 w-4 text-slate-400" />
              Change Password
            </button>
            <button onClick={onToggleTheme} className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left text-sm font-medium text-slate-200 transition hover:bg-slate-700/50 light:border-slate-300 light:bg-slate-200 light:text-slate-700 light:hover:bg-slate-300">
              {theme === "dark" ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4 text-indigo-400" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="flex w-full items-center gap-3 rounded-lg bg-slate-700/50 px-3 py-2.5 text-left text-sm font-medium text-slate-200 transition hover:bg-slate-700/50 light:bg-slate-200 light:text-slate-800 light:hover:bg-slate-300">
              <LogOut className="h-4 w-4 text-indigo-400" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
