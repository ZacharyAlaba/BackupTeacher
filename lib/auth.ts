import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { authSecret } from "@/lib/authSecret";
import bcrypt from "bcryptjs";

type DemoUser = {
  id: string;
  email?: string;
  studentId?: string;
  password: string;
  name: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
};

const demoUsers: DemoUser[] = [
  {
    id: "demo-admin",
    email: "admin@school.edu",
    password: "admin123",
    name: "Admin User",
    role: "ADMIN",
  },
  {
    id: "demo-teacher",
    email: "teacher@example.com",
    password: "teacher123",
    name: "Teacher User",
    role: "TEACHER",
  },
  {
    id: "demo-student",
    studentId: "STU001",
    password: "student123",
    name: "Student User",
    role: "STUDENT",
  },
];

const isPlaceholderDatabaseUrl =
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes("username:password@host");

const isDemoAuthEnabled =
  process.env.DEMO_AUTH_ENABLED === "true" || isPlaceholderDatabaseUrl;

function authorizeDemoUser(identifier: string, password: string, role?: string) {
  if (!isDemoAuthEnabled) {
    return null;
  }

  const demoUser = demoUsers.find((user) =>
    user.email === identifier || user.studentId === identifier
  );

  if (!demoUser || demoUser.password !== password) {
    return null;
  }

  if (role && demoUser.role !== role) {
    return null;
  }

  return {
    id: demoUser.id,
    email: demoUser.email,
    studentId: demoUser.studentId,
    name: demoUser.name,
    role: demoUser.role,
  };
}

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    return null;
  }

  const normalizedUrl = url.trim().toLowerCase();
  const normalizedKey = serviceRole.trim().toLowerCase();

  if (
    normalizedUrl.includes("your-project") ||
    normalizedUrl.includes("placeholder") ||
    normalizedKey.includes("your") ||
    normalizedKey.includes("placeholder") ||
    normalizedKey.includes("changeme")
  ) {
    return null;
  }

  return createClient(url, serviceRole, {
    auth: { persistSession: false },
  });
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or Student ID", type: "text" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          return null;
        }

        const supabase = createSupabaseAdmin();

        try {
          if (supabase) {
            const { data: user } = await supabase
              .from("User")
              .select("*")
              .eq("email", credentials.identifier)
              .maybeSingle();

            if (user) {
              const isPasswordValid = await bcrypt.compare(
                credentials.password,
                (user as { password?: string }).password || ""
              );

              if (isPasswordValid) {
                if (
                  credentials.role &&
                  (credentials.role === "ADMIN" || credentials.role === "TEACHER" || credentials.role === "STUDENT") &&
                  (user as { role?: string }).role !== credentials.role
                ) {
                  return null;
                }

                return {
                  id: (user as { id: string }).id,
                  email: (user as { email: string }).email,
                  name: (user as { name: string }).name,
                  role: (user as { role: "ADMIN" | "TEACHER" | "STUDENT" }).role,
                };
              }
            }

            const { data: student } = await supabase
              .from("Student")
              .select(`id, studentId, User(id, email, name, password, role)`)
              .eq("studentId", credentials.identifier)
              .maybeSingle();

            const linkedUser = Array.isArray((student as any)?.User)
              ? (student as any).User[0]
              : (student as any)?.User;

            if (student && linkedUser) {
              const isPasswordValid = await bcrypt.compare(
                credentials.password,
                linkedUser.password || ""
              );

              if (isPasswordValid) {
                if (credentials.role && credentials.role !== "STUDENT") {
                  return null;
                }

                return {
                  id: linkedUser.id,
                  email: linkedUser.email,
                  studentId: student.studentId,
                  name: linkedUser.name,
                  role: "STUDENT",
                };
              }
            }
          }

          // Try to find by email first (admin/teacher)
          const user = await prisma.user.findUnique({
            where: { email: credentials.identifier },
          });

          if (user) {
            const isPasswordValid = await bcrypt.compare(
              credentials.password,
              user.password
            );

            if (isPasswordValid) {
              if (
                credentials.role &&
                (credentials.role === "ADMIN" || credentials.role === "TEACHER" || credentials.role === "STUDENT") &&
                user.role !== credentials.role
              ) {
                return null;
              }

              return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
              };
            }
          }

          // Try to find by studentId (student)
          const student = await prisma.student.findUnique({
            where: { studentId: credentials.identifier },
            include: { user: true },
          });

          if (student) {
            const isPasswordValid = await bcrypt.compare(
              credentials.password,
              student.user.password
            );

            if (isPasswordValid) {
              if (credentials.role && credentials.role !== "STUDENT") {
                return null;
              }

              return {
                id: student.user.id,
                email: student.user.email,
                studentId: student.studentId,
                name: student.user.name,
                role: "STUDENT",
              };
            }
          }
        } catch {
          return authorizeDemoUser(
            credentials.identifier,
            credentials.password,
            credentials.role
          );
        }

        return authorizeDemoUser(
          credentials.identifier,
          credentials.password,
          credentials.role
        );
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.studentId = (user as any).studentId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
        (session.user as any).studentId = token.studentId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: authSecret,
};
