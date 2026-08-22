import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

async function main() {
  // Load environment from Schedule/.env if not already set
  const envPath = join(process.cwd(), '.env');
  try {
    const envRaw = readFileSync(envPath, 'utf-8');
    let fileServiceKey: string | null = null;
    envRaw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      // Prefer existing process.env values unless they look like placeholders
      const existing = process.env[key];
      const looksPlaceholder = (s?: string) => !s || s.toLowerCase().includes('your') || s.toLowerCase().includes('placeholder') || s.toLowerCase().includes('changeme');
      if (!existing || looksPlaceholder(existing)) {
        process.env[key] = val;
      }
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') fileServiceKey = val;
    });
    const fileServiceKeyString: string = fileServiceKey || '';
    if (fileServiceKeyString) {
      const m = fileServiceKeyString.slice(0, 6) + '...' + fileServiceKeyString.slice(-6);
      console.log(`Parsed SUPABASE_SERVICE_ROLE_KEY from .env (masked): ${m}`);
    } else {
      console.log('No SUPABASE_SERVICE_ROLE_KEY found in .env file');
    }
  } catch {
    // ignore if .env not present
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
    process.exit(2);
  }

  try {
    // Debug minimal, masked info
    const maskedKey = serviceKey.slice(0, 6) + '...' + serviceKey.slice(-6);
    console.log(`Testing Supabase REST at ${url} using key ${maskedKey}`);
    const restUrl = `${url.replace(/\/$/, '')}/rest/v1/User?select=id&limit=1`;
    const res = await fetch(restUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('Supabase REST request failed:', res.status, res.statusText, body);
      process.exit(1);
    }

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      console.log('✅ Supabase reachable — sample `User` row found.');
    } else {
      console.log('✅ Supabase reachable — no `User` rows returned (table may be empty).');
    }
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error testing Supabase connectivity:', err);
    process.exit(1);
  }
}

main();
