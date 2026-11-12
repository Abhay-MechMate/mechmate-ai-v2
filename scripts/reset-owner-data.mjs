// Wipes all car + diagnosis data for ONE owner account (keeps the login).
//
// Usage:  node scripts/reset-owner-data.mjs <email>
//
// Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
// (service role = admin key, bypasses row security; it is a local secret and is
// never printed or committed). Rows are matched by the auth user id that the
// email resolves to, so no other profile can ever be touched. If the email
// matches zero or several accounts the script aborts without deleting.
//
// diagnostic_turns cascade with their session; session.vehicle_id is set null
// when a vehicle goes, so two deletes cover everything.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// Minimal .env.local loader (KEY=VALUE lines, quotes stripped) — dotenv is not
// a project dependency and this avoids adding one.
for (const line of readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !(m[1] in process.env)) {
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Usage: node scripts/reset-owner-data.mjs <email>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "Missing env. Put SUPABASE_SERVICE_ROLE_KEY in .env.local (NEXT_PUBLIC_SUPABASE_URL is also required).",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Resolve the email to exactly one auth account.
let userId = null;
let page = 1;
for (;;) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error(`Could not list accounts: ${error.message}`);
    process.exit(1);
  }
  const matches = data.users.filter((u) => (u.email ?? "").toLowerCase() === email);
  if (matches.length > 1) {
    console.error(`Email matches ${matches.length} accounts; aborting (delete nothing).`);
    process.exit(1);
  }
  if (matches.length === 1) {
    userId = matches[0].id;
    break;
  }
  if (data.users.length < 200) break;
  page += 1;
}
if (!userId) {
  console.error(`No account found for ${email}; aborting (delete nothing).`);
  process.exit(1);
}
console.log(`Account: ${email} (${userId})`);

const tables = ["diagnostic_sessions", "vehicles"];
for (const table of tables) {
  const { data, error } = await supabase.from(table).delete().eq("user_id", userId).select("id");
  if (error) {
    console.error(`Failed to delete from ${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`  ${table}: deleted ${data?.length ?? 0} rows`);
}
console.log("Done. The account itself was not touched.");
