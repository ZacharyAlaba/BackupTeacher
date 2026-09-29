"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  BookOpen,
  Building2,
  GraduationCap,
  Clock,
  BarChart3,
  Database,
  LogOut,
  ShieldAlert,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useTeacherTheme } from "@/lib/useTeacherTheme";

export default function AdminSidebar() {
  const router = useRouter();
  const { theme, toggleTheme } = useTeacherTheme();

  const navItems: { label: string; href: string; icon: LucideIcon; color: string }[] = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard, color: "text-blue-400" },
    { label: "Schedule Builder", href: "/admin/schedule-builder", icon: CalendarDays, color: "text-red-400" },
    { label: "Teachers", href: "/admin/teachers", icon: Users, color: "text-green-400" },
    { label: "Subjects", href: "/admin/subjects", icon: BookOpen, color: "text-purple-400" },
    { label: "Sections", href: "/admin/sections", icon: Building2, color: "text-yellow-400" },
    { label: "Students", href: "/admin/students", icon: GraduationCap, color: "text-cyan-400" },
    { label: "Conflicts", href: "/admin/conflicts", icon: ShieldAlert, color: "text-orange-400" },
  ];

  const settingsItems: { label: string; href: string; icon: LucideIcon; color: string }[] = [
    { label: "Time Slots", href: "/admin/time-slots", icon: Clock, color: "text-indigo-400" },
    { label: "Workload", href: "/admin/workload", icon: BarChart3, color: "text-pink-400" },
  ];

  return (
    <aside className="sticky top-6 hidden self-start md:block">
      <div className="sticky top-6 w-64 rounded-lg border border-slate-700 bg-slate-800 p-4 light:border-slate-200 light:bg-white">
        {/* Logo */}
        <div className="mb-6 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center bg-white">
            <Image
              src="/images/logo.jpg"
              alt="Libertad NHS Logo"
              width={32}
              height={32}
              className="object-cover"
            />
          </div>
        </div>

        {/* Admin User Badge */}
        <div className="mb-6 px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600 light:border-slate-200 light:bg-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider light:text-slate-500">Admin User</p>
          <p className="text-sm font-medium text-white mt-1 light:text-slate-900">AU</p>
        </div>

        {/* Navigation Section */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-3 light:text-slate-500">NAVIGATION</p>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 bg-slate-700/50 hover:bg-slate-700 transition-all group light:bg-slate-200 light:text-slate-800 light:hover:bg-slate-300"
              >
                <item.icon className={`h-4 w-4 ${item.color}`} />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Settings Section */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-3 light:text-slate-500">SETTINGS</p>
          <nav className="space-y-1">
            {settingsItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 bg-slate-700/50 hover:bg-slate-700 transition-all light:bg-slate-200 light:text-slate-800 light:hover:bg-slate-300"
              >
                <item.icon className={`h-4 w-4 ${item.color}`} />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="border-t border-slate-700 pt-4 space-y-2 light:border-slate-200">
          <button
            onClick={() => router.push('/admin/data')}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition-all light:bg-slate-200 light:text-slate-800 light:hover:bg-slate-300"
          >
            <Database className="h-4 w-4" />
            Manage Data
          </button>

          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700/50 transition-all light:border-slate-300 light:bg-slate-200 light:text-slate-700 light:hover:bg-slate-300"
          >
            {theme === "dark" ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4 text-indigo-400" />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>

          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-700/50 hover:border-slate-600 hover:bg-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition-all light:border-slate-300 light:bg-slate-200 light:text-slate-800 light:hover:bg-slate-300"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
