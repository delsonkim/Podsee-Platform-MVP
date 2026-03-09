/**
 * Backup script for centre data.
 * Run before any schema migration to preserve onboarded centre information.
 *
 * Usage:  NODE_PATH=./app/node_modules npx tsx scripts/backup-centres.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";

// Load env from app/.env.local (no dotenv dependency needed)
const envPath = resolve(__dirname, "../app/.env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in app/.env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function backup() {
  console.log("Fetching centre data...\n");

  // Fetch all tables related to centres
  const [centres, centreSubjects, centreUsers, slots, subjects] = await Promise.all([
    supabase.from("centres").select("*"),
    supabase.from("centre_subjects").select("*"),
    supabase.from("centre_users").select("*"),
    supabase.from("trial_slots").select("*"),
    supabase.from("subjects").select("*"),
  ]);

  // Check for errors
  for (const [name, result] of Object.entries({ centres, centreSubjects, centreUsers, slots, subjects })) {
    if (result.error) {
      console.error(`Error fetching ${name}:`, result.error.message);
      process.exit(1);
    }
  }

  const backup = {
    exported_at: new Date().toISOString(),
    tables: {
      centres: { count: centres.data!.length, rows: centres.data },
      centre_subjects: { count: centreSubjects.data!.length, rows: centreSubjects.data },
      centre_users: { count: centreUsers.data!.length, rows: centreUsers.data },
      trial_slots: { count: slots.data!.length, rows: slots.data },
      subjects: { count: subjects.data!.length, rows: subjects.data },
    },
  };

  // Write to backups directory
  const backupsDir = resolve(__dirname, "../backups");
  if (!existsSync(backupsDir)) mkdirSync(backupsDir, { recursive: true });

  const date = new Date().toISOString().slice(0, 10);
  const filename = `centres-backup-${date}.json`;
  const filepath = resolve(backupsDir, filename);

  writeFileSync(filepath, JSON.stringify(backup, null, 2));

  console.log(`Backup saved to: backups/${filename}`);
  console.log("\nSummary:");
  for (const [table, data] of Object.entries(backup.tables)) {
    console.log(`  ${table}: ${data.count} rows`);
  }
}

backup().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
