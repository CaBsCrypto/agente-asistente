import assert from "node:assert/strict";
import test from "node:test";
import { Keypair } from "@stellar/stellar-sdk";
import {
  getPrivyStellarReadiness,
  isValidStellarAddress,
  verifyStellarSignature,
} from "../app/privy-stellar";

test("validates Stellar Ed25519 public addresses", () => {
  const keypair = Keypair.random();
  assert.equal(isValidStellarAddress(keypair.publicKey()), true);
  assert.equal(isValidStellarAddress("not-a-stellar-address"), false);
});

test("verifies the signature primitive used by the Privy test harness", () => {
  const keypair = Keypair.random();
  const payload = Buffer.from("agent-assistant-test-payload");
  const signature = keypair.sign(payload);
  assert.equal(verifyStellarSignature(keypair.publicKey(), payload, signature), true);
  assert.equal(
    verifyStellarSignature(keypair.publicKey(), Buffer.from("tampered-payload"), signature),
    false,
  );
});

test("readiness never exposes Privy secrets", () => {
  const readiness = getPrivyStellarReadiness();
  assert.deepEqual(Object.keys(readiness).sort(), [
    "chainType",
    "configured",
    "friendbotUrl",
    "horizonUrl",
    "mode",
    "network",
  ]);
});
