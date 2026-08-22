#!/usr/bin/env node
/**
 * Direct SQL migration runner for Supabase
 * Usage: npx tsx apply-migration.ts
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "❌ Missing Supabase env vars NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: require("ws") },
});

async function applyMigration() {
  try {
    const sql = readFileSync(
      "supabase/migrations/0002_add_subject_student_enrollment.sql",
      "utf-8"
    );

    console.log("🚀 Applying SQL migration...");
    console.log(sql);

    // Note: Supabase client doesn't have raw SQL execution.
    // Using REST API instead
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sql }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Migration failed:", error);
      process.exit(1);
    }

    console.log("✅ Migration applied successfully");
  } catch (error) {
    console.error("❌ Error applying migration:", error);
    process.exit(1);
  }
}

applyMigration();
