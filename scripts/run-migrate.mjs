// One-off migration runner that reads the DB connection string from a local,
// git-ignored .env.migrate file and applies pending Drizzle migrations.
// The secret is never printed; only migration progress is shown.
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const file = ".env.migrate";
let loaded = 0;
for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (!match) continue;
  const value = match[2].replace(/^["']|["']$/g, "").trim();
  if (!value) continue;
  process.env[match[1]] = value;
  loaded++;
}
if (loaded === 0) {
  console.error(`No variables found in ${file}. Paste the DATABASE_URL_UNPOOLED value there first.`);
  process.exit(1);
}
console.log(`Loaded ${loaded} var(s) from ${file}. Applying migrations...`);
execSync("npx drizzle-kit migrate", { stdio: "inherit", env: process.env });
