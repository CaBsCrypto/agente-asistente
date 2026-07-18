# Lang ecosystem architecture

agent-assistant uses the Lang ecosystem as an interpretation and orchestration
layer. It never replaces deterministic policy checks, Privy authorization or
on-chain receipt verification.

## Product map

| Component | Current state | Responsibility | Explicit boundary |
| --- | --- | --- | --- |
| LangChain | Live in production | Convert natural-language requests into schema-validated plans | Cannot sign, submit or authorize transactions |
| LangGraph | Package installed; runtime migration pending | Persist multi-step workflows, interrupt for approval and resume safely | Will not bypass policy or approval nodes |
| LangSmith | Not enabled | Future tracing, datasets and offline/online evaluation | Must redact wallet and personal-memory data before export |
| Graphify | Active locally | Visual source-code graph and read-only MCP for development | Not a runtime agent memory and not an authority system |

## Runtime today

~~~mermaid
flowchart LR
  U["User request"] --> D{"Deterministic intent?"}
  D -->|Yes| R["Existing safe route"]
  D -->|No| L["LangChain + OpenRouter"]
  L --> Z["Zod plan validation"]
  Z --> P["Policy engine"]
  R --> P
  P -->|Read only| T["Call bounded tool"]
  P -->|Financial| V["Privy review and approval"]
  V --> X["Submit one frozen transaction"]
  T --> E["Store evidence"]
  X --> E
~~~

The production planner currently recognizes English, Spanish and Portuguese.
It extracts intent, provider, asset, amount and slippage into a strict schema.
Financial classifications are forced back through deterministic controls even
if the model incorrectly marks them as safe.

## LangGraph migration

LangGraph is the next orchestration layer, not a rewrite of business logic.
The first graph should contain these nodes:

1. `classify_request`;
2. `retrieve_scoped_memory`;
3. `discover_tools`;
4. `prepare_action`;
5. `evaluate_policy`;
6. `interrupt_for_approval`;
7. `execute_once`;
8. `verify_receipt`;
9. `record_outcome`.

Checkpointing will allow a workflow to stop at approval and resume later. The
idempotency key, frozen transaction hash and durable database receipt remain
the source of truth against duplicate execution.

## LangSmith adoption gate

LangSmith becomes useful after we have enough real traces to evaluate. Before
enabling it, define:

- a redaction policy for emails, wallet addresses and personal memories;
- a 20-50 example intent-routing dataset;
- deterministic evaluators for tool choice, amount parsing and approval rules;
- sampling and budget limits for production tracing;
- retention and deletion rules.

The first YC demo does not depend on LangSmith. Local tests and durable product
receipts remain the acceptance evidence.

## Graphify is different

Graphify answers developer questions about the repository: which modules call
which routes, where policies live and what will be affected by a change. Neon
stores product state and user-scoped memory. LangGraph will store workflow
checkpoints. These systems must not be presented as interchangeable.

## Validation

~~~bash
npm run langchain:smoke
npm run test
npm run graph:update
~~~

Public readiness is available at `GET /api/agent/infrastructure`. It reports
whether the LangChain planner is enabled without exposing provider secrets.

## Official references

- [LangChain overview](https://docs.langchain.com/oss/javascript/langchain/overview)
- [LangGraph overview](https://docs.langchain.com/oss/javascript/langgraph/overview)
- [LangGraph persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)
- [LangSmith evaluation](https://docs.langchain.com/langsmith/evaluation)
