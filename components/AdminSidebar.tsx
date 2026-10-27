"use client";

import Link from "next/link";
import Image from "next/image";
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
  MapPin,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useTeacherTheme } from "@/lib/useTeacherTheme";

export default function AdminSidebar() {
  const { theme, toggleTheme } = useTeacherTheme();

  const navItems: { label: string; href: string; icon: LucideIcon; color: string }[] = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard, color: "text-blue-400" },
    { label: "Schedule Builder", href: "/admin/schedule-builder", icon: CalendarDays, color: "text-red-400" },
    { label: "Teachers", href: "/admin/teachers", icon: Users, color: "text-green-400" },
    { label: "Subjects", href: "/admin/subjects", icon: BookOpen, color: "text-purple-400" },
    { label: "Sections", href: "/admin/sections", icon: Building2, color: "text-yellow-400" },
    { label: "Rooms", href: "/admin/rooms", icon: MapPin, color: "text-teal-400" },
    { label: "Students", href: "/admin/students", icon: GraduationCap, color: "text-cyan-400" },
    { label: "Conflicts", href: "/admin/conflicts", icon: ShieldAlert, color: "text-orange-400" },
  ];

  const settingsItems: { label: string; href: string; icon: LucideIcon; color: string }[] = [
    { label: "Time Slots", href: "/admin/time-slots", icon: Clock, color: "text-indigo-400" },
    { label: "Workload", href: "/admin/workload", icon: BarChart3, color: "text-pink-400" },
    { label: "Manage Data", href: "/admin/data", icon: Database, color: "text-cyan-400" },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-44 md:block">
      <div className="flex h-full w-full flex-col border-r border-slate-700 bg-slate-800 p-2.5 light:border-slate-200 light:bg-white">
        {/* Logo */}
        <div className="mb-3 flex shrink-0 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-lg bg-white">
            <Image
              src="/images/logo.jpg"
              alt="Libertad NHS Logo"
              width={28}
              height={28}
              className="object-cover"
            />
          </div>
        </div>

        {/* Admin User Badge */}
        <div className="mb-3 shrink-0 rounded-lg border border-slate-600 bg-slate-700/50 px-2.5 py-1.5 light:border-slate-200 light:bg-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider light:text-slate-500">Admin User</p>
          <p className="text-sm font-medium text-white mt-1 light:text-slate-900">AU</p>
        </div>

        <div className="flex flex-col gap-3">
          {/* Navigation Section */}
          <div>
            <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400 light:text-slate-500">NAVIGATION</p>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-2 rounded-lg bg-slate-700/50 px-2 py-1.5 text-xs font-medium text-slate-200 transition-all hover:bg-slate-700 light:bg-slate-200 light:text-slate-800 light:hover:bg-slate-300"
                >
                  <item.icon className={`h-4 w-4 shrink-0 ${item.color}`} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Settings Section */}
          <div>
            <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400 light:text-slate-500">SETTINGS</p>
            <nav className="space-y-1">
              {settingsItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 rounded-lg bg-slate-700/50 px-2 py-1.5 text-xs font-medium text-slate-200 transition-all hover:bg-slate-700 light:bg-slate-200 light:text-slate-800 light:hover:bg-slate-300"
                >
                  <item.icon className={`h-4 w-4 shrink-0 ${item.color}`} />
                  {item.label}
                </Link>
              ))}
              <button
                onClick={toggleTheme}
                className="flex w-full items-center gap-2 rounded-lg border border-transparent bg-slate-700/50 px-2 py-1.5 text-left text-xs font-medium text-slate-200 transition-all hover:bg-slate-700 light:border-slate-300 light:bg-slate-200 light:text-slate-700 light:hover:bg-slate-300"
              >
                {theme === "dark" ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4 text-indigo-400" />}
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>
            </nav>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-1 shrink-0">
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-700/50 px-2 py-1.5 text-xs font-medium text-slate-200 transition-all hover:border-slate-600 hover:bg-slate-700 light:border-slate-300 light:bg-slate-200 light:text-slate-800 light:hover:bg-slate-300"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
