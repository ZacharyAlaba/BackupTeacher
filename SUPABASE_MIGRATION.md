# Supabase Migration Guide

## Overview
This guide walks you through migrating your Teacher Scheduling app from Prisma to Supabase for Vercel deployment.

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign up
2. Create a new project
3. Copy these credentials:
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_ANON_KEY` (Publishable key)
   - `SUPABASE_SERVICE_ROLE_KEY` (Secret key - keep private!)

## Step 2: Set Up Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/migrations/0001_create_schema.sql`
4. Paste it into the SQL editor
5. Click **Run**

This creates all tables, enums, indexes, and relationships.

## Step 3: Configure Environment Variables

### Local Development (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL="your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
```

### Vercel Production
In your Vercel project settings → Environment Variables, add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (mark as Secret)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (your production domain)

## Step 4: Seed Initial Data

Run the Supabase seed script locally:
```bash
npm run seed:supabase
```

This creates:
- Admin user (admin@school.edu / admin123)
- Sample teachers, students, sections
- Time slots from `data/time_slots.csv`

## Step 5: Update API Routes

### Using Supabase-specific routes

**Old (Prisma):**
```typescript
import { prisma } from "@/lib/prisma";
const students = await prisma.student.findMany();
```

**New (Supabase):**
```typescript
import { createClient } from "@/utils/supabase/server";
const supabase = createClient(cookieStore);
const { data: students } = await supabase.from("Student").select("*");
```

### Provided Helper Routes
We've created Supabase-compatible routes at:
- `/api/auth/signup-supabase` → Use instead of `/api/auth/signup`
- Additional admin routes coming

### Pattern for API Routes
```typescript
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth/next";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role === "ADMIN") return new Response("Unauthorized", { status: 401 });

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data, error } = await supabase
    .from("Student")
    .select("*");
  
  if (error) throw error;
  return Response.json(data);
}
```

## Step 6: Authentication Update

NextAuth continues to work with Supabase. Update `lib/auth.ts`:

```typescript
import { createClient } from "@/utils/supabase/server";

async function authorize(credentials: any) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data: user, error } = await supabase
    .from("User")
    .select("*")
    .eq("email", credentials.email)
    .maybeSingle();
  
  if (error || !user) return null;
  
  const passwordMatch = await bcrypt.compare(credentials.password, user.password);
  if (!passwordMatch) return null;
  
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
```

## Step 7: Deploy to Vercel

1. Push your code to GitHub
2. In Vercel, link your repository
3. Add environment variables (see Step 3)
4. Deploy!

The build will:
- Install dependencies
- Generate types from Supabase schema
- Run tests (if configured)
- Deploy to serverless functions

## Step 8: Database Backups

Supabase provides automatic backups. To manually backup:

1. In Supabase dashboard → Backups
2. Click "Request backup"
3. Download when ready

## Troubleshooting

### Connection errors
- Check Supabase URL and keys
- Verify environment variables on Vercel
- Check Supabase project is not paused

### Data missing after migration
- Confirm all tables were created (check "Tables" in Supabase)
- Re-run the seed script
- Check for foreign key constraint errors in logs

### Authentication failing
- Ensure `User` table has correct data
- Check password hashing (should be bcrypt)
- Verify NEXTAUTH_SECRET is set

## Rollback to Prisma

If needed, you can keep Prisma as a fallback:
- Set `USE_PRISMA=true` in build environment
- Both Prisma and Supabase clients will be available

## Support

For issues:
1. Check Supabase documentation: https://supabase.com/docs
2. Check NextAuth docs: https://next-auth.js.org/
3. Check logs in Vercel dashboard or Supabase logs

---

**Status:** Partial migration ready. Core tables created, seed script pending, API routes in progress.
