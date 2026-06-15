/**
 * Supabase-compatible NextAuth configuration
 * Replace lib/auth.ts with this version for Supabase
 */

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";
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

const isPlaceholderSupabaseUrl =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("https://your-project");

const isDemoAuthEnabled =
  process.env.DEMO_AUTH_ENABLED === "true" || isPlaceholderSupabaseUrl;

function authorizeDemoUser(
  identifier: string,
  password: string,
  role?: string
) {
  if (!isDemoAuthEnabled) {
    return null;
  }

  const demoUser = demoUsers.find(
    (user) => user.email === identifier || user.studentId === identifier
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

// Create Supabase admin client for auth checks
function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    return null;
  }

  return createClient(url, serviceRole);
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
        if (!supabase) {
          // Fall back to demo auth if Supabase not configured
          return authorizeDemoUser(
            credentials.identifier,
            credentials.password,
            credentials.role
          );
        }

        try {
          // Try to find by email first (admin/teacher)
          const { data: user } = await supabase
            .from("User")
            .select("*")
            .eq("email", credentials.identifier)
            .maybeSingle();

          if (user) {
            const isPasswordValid = await bcrypt.compare(
              credentials.password,
              user.password
            );

            if (isPasswordValid) {
              if (
                credentials.role &&
                (credentials.role === "ADMIN" ||
                  credentials.role === "TEACHER" ||
                  credentials.role === "STUDENT") &&
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
          const { data: student } = await supabase
            .from("Student")
            .select(
              `
              id,
              studentId,
              User(id, email, name, password, role)
            `
            )
            .eq("studentId", credentials.identifier)
            .maybeSingle();

          if (student && student.User) {
            const isPasswordValid = await bcrypt.compare(
              credentials.password,
              student.User.password
            );

            if (isPasswordValid) {
              if (credentials.role && credentials.role !== "STUDENT") {
                return null;
              }

              return {
                id: student.User.id,
                email: student.User.email,
                studentId: student.studentId,
                name: student.User.name,
                role: "STUDENT",
              };
            }
          }
        } catch (error) {
          console.error("Supabase auth error:", error);
          // Fall back to demo auth on error
          return authorizeDemoUser(
            credentials.identifier,
            credentials.password,
            credentials.role
          );
        }

        // Fall back to demo auth if no user found
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
