import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen w-full items-stretch px-0">
        <div className="grid min-h-screen w-full overflow-hidden bg-white shadow-2xl lg:grid-cols-2">
          {/* Left Panel with Background Image */}
          <section 
            className="relative hidden flex-col justify-between p-8 text-white md:flex md:p-10 lg:p-12"
            style={{
              backgroundImage: "url('/images/libertad.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/50"></div>
            
            <div className="relative z-10">
              <div className="inline-flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-white/10 backdrop-blur">
                <Image
                  src="/images/logo.jpg"
                  alt="Libertad National High School"
                  width={80}
                  height={80}
                  className="object-cover"
                />
              </div>
              <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-white/90">
                Libertad National High School
              </p>
              <h1 className="mt-3 text-4xl font-bold leading-tight">
                Senior High School<br />Scheduling Portal
              </h1>
              <p className="mt-5 max-w-md text-white/90 leading-relaxed">
                One place for Senior High School class scheduling, teacher assignment, and timetable access.
              </p>
            </div>
            <p className="relative z-10 text-sm text-white/80">School year schedule management system</p>
          </section>

          {/* Right Panel with Portal Selection */}
          <section className="flex flex-col justify-center p-8 md:p-12 lg:px-16 lg:py-16">
            <div className="mb-8 lg:hidden">
              <div className="inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-indigo-100">
                <Image
                  src="/images/logo.jpg"
                  alt="Libertad National High School"
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>
            </div>
            
            <div>
              <h2 className="text-3xl font-bold text-slate-900">WELCOME BACK!</h2>
              <p className="mt-2 text-sm text-slate-600">Select the portal that matches your account.</p>
            </div>

            <div className="mt-10 w-full max-w-2xl space-y-5">
              <Link
                href="/login/admin"
                className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-7 transition hover:border-indigo-400 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
                  A
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Admin Portal</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">Manage sections, subject loads, and schedule assignments</p>
                </div>
              </Link>

              <Link
                href="/login/teacher"
                className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-cyan-50 to-cyan-100/50 p-7 transition hover:border-cyan-400 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-600 text-white font-bold">
                  T
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-600">Teacher Portal</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">View your class schedules and weekly teaching load</p>
                </div>
              </Link>

              <Link
                href="/login/student"
                className="flex items-center gap-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-green-50 to-green-100/50 p-7 transition hover:border-green-400 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600 text-white font-bold">
                  S
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-600">Student Portal</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">View your class schedule and enrolled sections</p>
                </div>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
