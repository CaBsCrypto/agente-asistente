# Graph memory and project map

This project uses two different graph-related ideas. They solve different problems and must not be confused.

## Current architecture

| Layer | Tool | Status | Purpose |
| --- | --- | --- | --- |
| Exact user state | Neon/Postgres | Active | User-owned knowledge, policies, decisions and audit evidence |
| Topic retrieval | neon-topic-router | Active locally | Select only relevant user memories for the current message |
| Code architecture map | Graphify | Active locally | Visual and queryable map of repository code and dependencies |
| Temporal relationship memory | Graphiti | Evaluation only | Future people, projects, preferences and facts that change over time |

Neon remains the source of truth. Neither Graphify nor a future Graphiti deployment may authorize a financial action. Transaction policy checks and Privy confirmation remain separate.

## Topic-scoped user memory

The chat classifies each message into one or more domains:

- travel
- finance
- projects
- tasks
- people
- productivity
- general

Only active knowledge owned by the authenticated Privy user is considered. Memories are scored by domain match and keyword overlap, with a maximum of five returned. The assistant message stores the selected memory ids, source and score in its metadata.

In the chat, expand **Relevant memory**, **Memoria relevante** or **Memoria relevante** to inspect what was retrieved. This is provenance, not hidden authority.

### Local validation

1. Save three different memories:
   - Remember that I prefer quiet hotels with a desk
   - Remember that the YC application is my priority project
   - Remember that I prefer low-risk DeFi
2. Ask: Find a hotel for my next trip.
3. Expand **Relevant memory**. The travel preference should appear; YC and DeFi should not.
4. Ask: What tasks remain for the YC project?
5. The project memory should appear; travel and finance should not.
6. Sign in with a second Privy email and repeat the queries. No memory from the first user may appear.

Automated routing tests live in tests/agent-memory-retrieval.test.ts.

## Graphify: visual repository map

Graphify maps the application code into an interactive knowledge graph. The current local run used code-only mode, which parses code locally and does not require an LLM key.

Current snapshot:

- 909 nodes
- 1,727 edges
- 55 detected communities
- 99% extracted relations
- 0 LLM tokens

Generated files are local and ignored by Git:

- graphify-out/graph.html: interactive visual map
- graphify-out/graph.json: machine-readable graph
- graphify-out/GRAPH_REPORT.md: architecture report

### Rebuild locally

~~~powershell
npm run graph:extract
npm run graph:report
~~~

Then open graphify-out/graph.html in a browser. Search for agent-memory-store.ts, evaluateUserAction, DeFindex or x402. Node colors represent detected code communities; edges show imports, calls and other relationships.

For a textual path query:

~~~powershell
graphify query "what connects agent memory to policy execution"
~~~

The optional SQL parser is not installed, so SQL migration files are not part of the current graph. This does not affect the TypeScript application map.

## Why Graphiti is not active yet

Graphiti is a strong candidate for evolving personal memory because it supports temporal facts, provenance and hybrid graph retrieval. It is not a drop-in visual layer. The open-source engine requires operating a graph backend, model inference and embeddings, and the application must build its own user and conversation isolation.

Activating it before a multi-tenant evaluation would add cost and privacy risk without improving the current YC demo. A future spike must use a separate provider behind Neon and pass these gates:

1. No cross-user retrieval in adversarial tests.
2. Current facts supersede older facts without deleting history.
3. Every retrieved fact includes source provenance.
4. Relevant recall succeeds in the top five results.
5. Unrelated memories are excluded.
6. Retrieval latency is measured and bounded.
7. Every use is written to the existing audit trail.
8. GRAPHITI_TELEMETRY_ENABLED=false is set for the evaluation.

Graphiti may enrich recommendations later, but execution policies, wallet ownership and transaction approval remain in the existing application boundary.
