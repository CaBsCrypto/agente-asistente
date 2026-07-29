-- Idempotency keys are unique per actor, not globally.
--
-- Under the old global index, an idempotency key chosen by one caller collided
-- with another caller's key, and the conflict re-select returned the *other*
-- actor's intent. Scoping the index to (actor_id, idempotency_key) removes both
-- the disclosure and the griefing vector where one caller can burn another's key.
DROP INDEX IF EXISTS "commerce_intents_idempotency_key_uidx";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "commerce_intents_actor_idempotency_uidx"
  ON "commerce_intents" ("actor_id", "idempotency_key");
