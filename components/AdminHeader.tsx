"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AdminHeader() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <header className="border-b border-slate-700 bg-slate-900/50 light:border-slate-200 light:bg-white/80">
      <div className="w-full px-4 py-4 md:px-6 xl:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg overflow-hidden flex items-center justify-center bg-white">
                <Image
                  src="/images/logo.jpg"
                  alt="Libertad NHS Logo"
                  width={40}
                  height={40}
                  className="object-cover"
                />
              </div>
              <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider light:text-slate-500">
                  Libertad NHS Senior High
                </p>
                <p className="text-sm font-medium text-white light:text-slate-900">Admin Dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
