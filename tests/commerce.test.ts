import test from"node:test";import assert from"node:assert/strict";import{CommerceService,InMemoryIntentStore}from"../app/domain";
test("idempotency returns the same intent and receipt",()=>{const service=new CommerceService(new InMemoryIntentStore()),input={offerId:"defindex-yield-demo",actorId:"demo-user",idempotencyKey:"stable-key-001"};const first=service.createIntent(input),duplicate=service.createIntent(input);assert.equal(duplicate.replayed,true);assert.equal(duplicate.intent.id,first.intent.id);service.evaluatePolicy(first.intent.id,"demo-user");const authorized=service.authorize(first.intent.id,"demo-user",true);const one=service.execute(first.intent.id,"demo-user",authorized.authorization!.token),two=service.execute(first.intent.id,"demo-user",authorized.authorization!.token);assert.equal(one.id,two.id);assert.equal(two.replayed,true)});
test("policy rejects an amount above the demo limit",()=>{const service=new CommerceService(new InMemoryIntentStore()),{intent}=service.createIntent({offerId:"defindex-yield-demo",actorId:"demo-user",idempotencyKey:"stable-key-002",amount:101});assert.equal(service.evaluatePolicy(intent.id,"demo-user").status,"rejected");assert.throws(()=>service.authorize(intent.id,"demo-user",true),/policy_approval_required/)});
test("execution requires the exact authorization capability",()=>{const service=new CommerceService(new InMemoryIntentStore()),{intent}=service.createIntent({offerId:"innovation-day-pass",actorId:"demo-user",idempotencyKey:"stable-key-003"});service.evaluatePolicy(intent.id,"demo-user");service.authorize(intent.id,"demo-user",true);assert.throws(()=>service.execute(intent.id,"demo-user","auth_wrong_token"),/invalid_authorization/)});

test("one actor cannot reach another actor's intent",()=>{const service=new CommerceService(new InMemoryIntentStore());const{intent}=service.createIntent({offerId:"defindex-yield-demo",actorId:"actor-alice",idempotencyKey:"shared-key"});
  // Mallory knows the intent id — the only thing standing between them is the actor scope.
  assert.throws(()=>service.evaluatePolicy(intent.id,"actor-mallory"),/intent_not_found/);
  assert.throws(()=>service.authorize(intent.id,"actor-mallory",true),/intent_not_found/);
  assert.throws(()=>service.execute(intent.id,"actor-mallory","auth_anything"),/intent_not_found/);
  assert.throws(()=>service.getReceipt(intent.id,"actor-mallory"),/intent_not_found/)});

test("the same idempotency key under a different actor yields a separate intent",()=>{const service=new CommerceService(new InMemoryIntentStore());const alice=service.createIntent({offerId:"defindex-yield-demo",actorId:"actor-alice",idempotencyKey:"shared-key"});const mallory=service.createIntent({offerId:"defindex-yield-demo",actorId:"actor-mallory",idempotencyKey:"shared-key"});
  assert.equal(mallory.replayed,false);
  assert.notEqual(mallory.intent.id,alice.intent.id)});

test("evaluate_policy cannot rewind an executed intent",()=>{const service=new CommerceService(new InMemoryIntentStore());const{intent}=service.createIntent({offerId:"defindex-yield-demo",actorId:"demo-user",idempotencyKey:"monotonic-key"});service.evaluatePolicy(intent.id,"demo-user");const authorized=service.authorize(intent.id,"demo-user",true);service.execute(intent.id,"demo-user",authorized.authorization!.token);
  assert.throws(()=>service.evaluatePolicy(intent.id,"demo-user"),/intent_already_final/);
  assert.equal(service.getReceipt(intent.id,"demo-user")!.intentId,intent.id)});
