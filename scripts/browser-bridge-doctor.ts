import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const extension = path.join(root, "browser-extension");
const manifest = JSON.parse(await readFile(path.join(extension, "manifest.json"), "utf8"));
const agentContent = await readFile(path.join(extension, "agent-content.js"), "utf8");
const background = await readFile(path.join(extension, "background.js"), "utf8");
const unblckContent = await readFile(path.join(extension, "unblck-content.js"), "utf8");

assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions, ["tabs"]);
assert.deepEqual(manifest.host_permissions, [
  "https://agente-asistente.vercel.app/*",
  "http://localhost:3000/*",
  "https://www.unblck.cl/*",
]);
assert.ok(!JSON.stringify(manifest).includes("<all_urls>"));
assert.match(agentContent, /UNBLCK_READ_STATUS/);
assert.match(background, /https:\/\/www\.unblck\.cl\/member\/\*/);
assert.match(unblckContent, /startsWith\("\/member\/"\)/);

for (const forbidden of ["document.cookie", "localStorage", "sessionStorage", "chrome.cookies", "chrome.scripting"]) {
  assert.ok(![agentContent, background, unblckContent].some((source) => source.includes(forbidden)), "forbidden capability: " + forbidden);
}

console.log("Browser Bridge doctor: PASS");
console.log("- Manifest V3");
console.log("- Exact host allowlist");
console.log("- Read-only UNBLCK status command");
console.log("- No cookie, storage or scripting access");
