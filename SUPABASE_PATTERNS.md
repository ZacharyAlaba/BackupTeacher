# Supabase Implementation Guide

This guide shows how to convert your existing Prisma routes to Supabase-compatible routes.

## Quick Start

1. **Create a Supabase project** at https://supabase.com
2. **Run the SQL migration** in your Supabase dashboard
3. **Set environment variables** in `.env.local` and Vercel
4. **Run the seed script**: `npm run seed:supabase`
5. **Update your API routes** using the patterns below

## Pattern 1: Simple GET with filtering

### Before (Prisma)
```typescript
import { prisma } from "@/lib/prisma";

export async function GET() {
  const teachers = await prisma.teacher.findMany({
    include: { user: true },
    where: { user: { role: "TEACHER" } },
    orderBy: { createdAt: "desc" }
  });
  return Response.json(teachers);
}
```

### After (Supabase)
```typescript
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: teachers, error } = await supabase
    .from("Teacher")
    .select(`
      *,
      User(*)
    `)
    .order("createdAt", { ascending: false });

  if (error) throw error;
  return Response.json(teachers);
}
```

## Pattern 2: Create with relationships

### Before (Prisma)
```typescript
const user = await prisma.user.create({
  data: {
    email,
    name,
    password: hashedPassword,
    role: "TEACHER",
    teacher: {
      create: { /* teacher data */ }
    }
  }
});
```

### After (Supabase)
```typescript
import { nanoid } from "nanoid";

const userId = nanoid();
const { data: user } = await supabase
  .from("User")
  .insert([{ id: userId, email, name, password: hashedPassword, role: "TEACHER" }])
  .select()
  .single();

const { data: teacher } = await supabase
  .from("Teacher")
  .insert([{ id: nanoid(), userId }])
  .select()
  .single();
```

## Pattern 3: Update with validation

### Before (Prisma)
```typescript
const updated = await prisma.section.update({
  where: { id: sectionId },
  data: { name, track, gradeLevel },
});
```

### After (Supabase)
```typescript
const { data: updated, error } = await supabase
  .from("Section")
  .update({
    name,
    track,
    gradeLevel,
    updatedAt: new Date().toISOString()
  })
  .eq("id", sectionId)
  .select()
  .single();

if (error) throw error;
```

## Pattern 4: Delete with cascade

### Before (Prisma)
```typescript
await prisma.section.delete({
  where: { id: sectionId }
});
// Cascades automatically
```

### After (Supabase)
```typescript
const { error } = await supabase
  .from("Section")
  .delete()
  .eq("id", sectionId);

if (error) throw error;
// Cascades are defined in schema (ON DELETE CASCADE)
```

## Pattern 5: Complex query with joins

### Before (Prisma)
```typescript
const records = await prisma.gradeRecord.findMany({
  where: {
    studentId,
    academicYear,
    gradingPeriod
  },
  include: {
    student: true,
    teacher: true,
    subject: true,
    section: true
  },
  orderBy: { createdAt: "desc" }
});
```

### After (Supabase)
```typescript
const { data: records, error } = await supabase
  .from("GradeRecord")
  .select(`
    *,
    Student(*),
    Teacher(*),
    Subject(*),
    Section(*)
  `)
  .eq("studentId", studentId)
  .eq("academicYear", academicYear)
  .eq("gradingPeriod", gradingPeriod)
  .order("createdAt", { ascending: false });

if (error) throw error;
```

## Pattern 6: Upsert (insert or update)

### Before (Prisma)
```typescript
const record = await prisma.gradeRecord.upsert({
  where: {
    studentId_subjectId_gradingPeriod_academicYear: {
      studentId, subjectId, gradingPeriod, academicYear
    }
  },
  update: { score, remarks },
  create: { studentId, teacherId, subjectId, sectionId, gradingPeriod, academicYear, score, remarks }
});
```

### After (Supabase)
```typescript
const { data, error } = await supabase
  .from("GradeRecord")
  .upsert([{
    id: nanoid(), // If new
    studentId,
    teacherId,
    subjectId,
    sectionId,
    gradingPeriod,
    academicYear,
    score,
    remarks,
    updatedAt: new Date().toISOString()
  }], {
    onConflict: "studentId,subjectId,gradingPeriod,academicYear"
  })
  .select()
  .single();

if (error) throw error;
```

## Pattern 7: Count and aggregation

### Before (Prisma)
```typescript
const count = await prisma.scheduleBlock.count({
  where: { teacherId }
});
```

### After (Supabase)
```typescript
const { count, error } = await supabase
  .from("ScheduleBlock")
  .select("*", { count: "exact", head: true })
  .eq("teacherId", teacherId);

if (error) throw error;
// count is the total count
```

## Common Issues & Solutions

### Issue: Relations not showing up
**Solution:** Make sure to use the exact table name in quotes:
```typescript
// ❌ Wrong
.select("*, teacher(*)")

// ✅ Correct
.select("*, Teacher(*)")
```

### Issue: Foreign key constraint error
**Solution:** Ensure records exist before inserting:
```typescript
// Check if section exists first
const { data: section } = await supabase
  .from("Section")
  .select("id")
  .eq("id", sectionId)
  .maybeSingle();

if (!section) {
  return Response.json({ error: "Section not found" }, { status: 404 });
}
```

### Issue: Password comparison failing
**Solution:** Ensure password is hashed before storing:
```typescript
import bcrypt from "bcryptjs";

const hashedPassword = await bcrypt.hash(password, 10);
const { data: user } = await supabase
  .from("User")
  .insert([{ id, email, password: hashedPassword }])
  .select()
  .single();
```

### Issue: Updated fields not updating
**Solution:** Manually set `updatedAt`:
```typescript
const { data } = await supabase
  .from("Student")
  .update({
    ...updates,
    updatedAt: new Date().toISOString()
  })
  .eq("id", id);
```

## Server vs Client Components

### For Server Components (use createClient from server.ts)
```typescript
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data } = await supabase.from("Section").select("*");
  
  return <div>{/* use data */}</div>;
}
```

### For Client Components (use createClient from client.ts)
```typescript
"use client";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

export default function Component() {
  const [data, setData] = useState([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from("Section").select("*");
      setData(data);
    };
    fetchData();
  }, []);

  return <div>{/* use data */}</div>;
}
```

### For API Routes (use createClient from server.ts)
```typescript
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  
  const { data } = await supabase.from("Section").select("*");
  
  return Response.json(data);
}
```

## Testing Your Routes

### Test with curl
```bash
curl -X GET http://localhost:3000/api/admin/students-supabase \
  -H "Cookie: your-auth-cookie"
```

### Test with fetch in browser console
```javascript
fetch('/api/admin/students-supabase')
  .then(r => r.json())
  .then(d => console.log(d))
```

## Next Steps

1. ✅ Run migration SQL
2. ✅ Set environment variables
3. ✅ Run seed script
4. 🔄 Convert remaining API routes using patterns above
5. 🔄 Update auth.ts to use `lib/auth-supabase.ts`
6. 🔄 Test all routes locally
7. ✅ Deploy to Vercel

---

See SUPABASE_MIGRATION.md for deployment steps.
