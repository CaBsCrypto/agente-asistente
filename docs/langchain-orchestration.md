# LangChain orchestration

agent-assistant uses LangChain as an optional **plan-only intent router**. It
does not replace Privy, Neon, the deterministic policy engine or the verified
Stellar connectors.

## Boundary

~~~mermaid
flowchart LR
  U[User message] --> D{Known deterministic intent?}
  D -->|Yes| R[Existing typed router]
  D -->|No| L[LangChain structured planner]
  L --> Z[Zod validation]
  Z --> P[Deterministic policy preflight]
  R --> P
  P -->|Allowed| T[Verified connector]
  P -->|Blocked| B[Explain without preparing]
  T --> H[Transaction-specific Privy approval]
  H --> S[Stellar Testnet submission]
~~~

The planner may classify and extract parameters. It cannot:

- authorize a financial action;
- choose arbitrary contracts or networks;
- receive a Privy token, signature, signed XDR or provider secret;
- bypass the policy engine;
- claim that an unverified action succeeded.

Financial plans are normalized to require explicit approval even if model
output says otherwise. Existing deterministic recognition runs first, keeping
known payment paths predictable and reducing model calls.

## Configuration

~~~text
AGENT_LANGCHAIN_ENABLED=true
AGENT_LANGCHAIN_PROVIDER=openrouter
AGENT_LANGCHAIN_MODEL=openrouter/free
OPENROUTER_API_KEY=server-only-secret
~~~
For the MVP, `openrouter/free` lets OpenRouter select a currently available free
model that supports the requested capabilities. Free capacity is rate-limited
and has no production reliability guarantee, so planner failures fall back to
the deterministic router. The model slug can be replaced later without changing
application code.

OpenRouter is the default provider. OpenAI remains an optional alternative via
`AGENT_LANGCHAIN_PROVIDER=openai` and `OPENAI_API_KEY`. With the flag disabled
or the selected provider key absent, the existing deterministic router remains
fully functional. Never use a `NEXT_PUBLIC_` prefix for a provider API key.

### Live smoke test

After adding the server-only key to `.env.local`, run:

~~~bash
npm run langchain:smoke
~~~

The test asks the planner to classify a DeFindex Testnet request, validates the
result with Zod, and fails unless the financial action requires approval. It
does not prepare, sign, or submit a transaction. The output records the selected
provider, model, safety boundary, and structured plan, making the integration
demonstrable without risking funds.

## Current capability

- EN/ES/PT plan classification.
- Structured and schema-validated output.
- DeFindex deposit and trustline routing into the existing review flow.
- Connection routing.
- Soroswap live Testnet quote and unsigned-XDR swap preparation.
- Planner metadata stored with the assistant message for later evaluation.

## Next LangGraph migration

The current bounded sequence is ready for live acceptance; the next durable graph is:

1. classify intent;
2. retrieve scoped memory;
3. evaluate deterministic policy;
4. request Soroswap quote;
5. interrupt for Privy approval;
6. submit and verify the swap;
7. optionally prepare a DeFindex deposit;
8. interrupt for a second approval;
9. store both receipts and make retries idempotent.

Neon remains the product source of truth. Graphify remains a local source-code
map; it is independent of the runtime LangChain/LangGraph stack.
