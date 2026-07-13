import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import test from "node:test";
import {
  sanitizeAdminReturnTo,
  verifyAdminCredentials,
} from "../app/admin/auth";

test("admin credentials require the configured founder and password", () => {
  const originalUsername = process.env.ADMIN_USERNAME;
  const originalHash = process.env.ADMIN_PASSWORD_HASH;

  const salt = "test-salt";
  const password = "correct-horse-battery-staple";
  const digest = scryptSync(password, salt, 64).toString("base64url");

  process.env.ADMIN_USERNAME = "founder";
  process.env.ADMIN_PASSWORD_HASH = "scrypt:" + salt + ":" + digest;

  assert.equal(verifyAdminCredentials("founder", password), true);
  assert.equal(verifyAdminCredentials("founder", "wrong-password"), false);
  assert.equal(verifyAdminCredentials("attacker", password), false);

  process.env.ADMIN_USERNAME = originalUsername;
  process.env.ADMIN_PASSWORD_HASH = originalHash;
});

test("admin return paths cannot escape the protected area", () => {
  assert.equal(sanitizeAdminReturnTo("/admin?view=pilots"), "/admin?view=pilots");
  assert.equal(sanitizeAdminReturnTo("//attacker.example"), "/admin");
  assert.equal(sanitizeAdminReturnTo("/waitlist"), "/admin");
  assert.equal(sanitizeAdminReturnTo("https://attacker.example"), "/admin");
});

