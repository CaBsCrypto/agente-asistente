# SOS and trusted contacts

Status: **Planned - post-YC experiment**

This document preserves a future Carmelita use case without expanding the current YC MVP. It is not implemented, deployed or available to users.

## Product idea

An older adult can ask Carmelita for help in plain language or press a large SOS control. Carmelita applies a previously configured safety policy, requests confirmation and notifies verified trusted contacts.

> Carmelita may help contact trusted people. It must never claim to replace emergency services, medical professionals or guaranteed emergency response.

## Proposed user experience

1. The user adds trusted contacts and each contact accepts the relationship.
2. The user chooses what may be shared: message, location, callback number and optional context.
3. The user says "I need help" or presses SOS.
4. Carmelita interprets the request and applies a deterministic assistance policy.
5. Carmelita shows exactly who will be contacted and what will be shared.
6. The user confirms the send.
7. Carmelita records delivery, acknowledgement and escalation evidence.

## Assistance levels

| Level | Example | Default behavior |
| --- | --- | --- |
| Green | "Tell my daughter I arrived." | Prepare a normal check-in and request confirmation. |
| Amber | "I feel unwell and need someone to call me." | Notify the primary contact and escalate to a backup if nobody acknowledges. |
| Red | "I fell and cannot get up." | Present an urgent handoff, contact configured people after confirmation and direct the user to local emergency services. |

The model may interpret language, but deterministic policy must decide recipients, information disclosure, retries and escalation.

## Smallest responsible MVP

Start with Telegram, not WhatsApp:

- one user and one or two verified trusted contacts;
- text-only check-in and help messages;
- optional, expiring location sharing;
- explicit confirmation before every send;
- delivery and acknowledgement status;
- one configurable escalation timer;
- immutable audit trail and duplicate-resistant sending;
- no medical diagnosis;
- no automatic call to emergency services.

Telegram is the recommended prototype because it can be tested quickly with a bot. WhatsApp Business should follow only after Meta account setup, approved message templates and a reviewed consent flow.

## Safety requirements

- Enrolment and contact consent are separate steps.
- Contacts must be verified before receiving sensitive data.
- The UI shows the exact recipient and payload before confirmation.
- Location is off by default and expires after the incident.
- Messages disclose that Carmelita sent them on the user's behalf.
- Delivery is not treated as acknowledgement.
- Failure, timeout and offline states remain visible.
- Every action has an audit event, idempotency key and retry-safe receipt.
- Sensitive health context is minimized, encrypted and deletable.

## Validation plan

Before implementation:

1. Interview five older adults and five family members or caregivers.
2. Validate the assistance levels and the language they naturally use.
3. Review accessibility: type size, voice, contrast and accidental taps.
4. Define the first supported country and emergency-service disclaimer.
5. Obtain a privacy and safety review before collecting health or location information.

Technical acceptance test:

1. Register and verify a trusted contact.
2. Prepare an amber message and confirm its recipient and payload.
3. Deliver it once and record the result.
4. Retry the same intent without sending a duplicate.
5. Record acknowledgement and escalation timestamps.
6. Demonstrate a safe failure when Telegram is unavailable.

## Relationship to Carmelita

The experiment reuses Carmelita's core primitives: personal memory, scoped connections, explicit authority, deterministic policy, human approval, provider execution, replay protection and verifiable evidence.

It demonstrates personal actions beyond commerce, but remains outside the current YC demo so the existing product stays reliable and focused.

## Decision gate

Do not open an implementation branch until:

- the YC application and recording are complete;
- target-user interviews support the need;
- one messaging channel is selected;
- consent, privacy and escalation rules are written;
- an owner accepts responsibility for safety testing.

When the gate is met, use:

```text
experiment/sos-trusted-contacts
```