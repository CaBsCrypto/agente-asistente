# Gemini notebook integration

"Gemini notebook" can mean two different products. They have different access
models and must not be presented as interchangeable.

## Option A: Gemini File Search (recommended MVP)

Gemini File Search is an API for creating file-search stores, importing
documents, indexing them and retrieving relevant passages for a model request.
This is the practical foundation for a private knowledge notebook inside
agent-assistant.

Recommended mapping:

```text
Privy user -> one logical notebook -> one Gemini File Search store
           -> imported Drive/Notion/uploads
           -> scoped retrieval
           -> LangGraph workflow
           -> cited answer or prepared action
```

Product rules:

- Store the external store id per Privy user in Neon.
- Never share a store between unrelated users.
- Require explicit consent before importing a Notion or Drive source.
- Store source metadata and deletion state in Neon.
- Retrieval may inform a plan but cannot authorize an action.
- Deleting a source must delete both our reference and the indexed document.
- Put ingestion and query budgets behind per-user limits.

The official File Search API supports file-store and document lifecycle
operations. Storage and query embeddings have their own pricing and limits, so
the free tier must be treated as a development allowance, not a permanent
business assumption.

## Option B: NotebookLM Enterprise API

Google Cloud provides a NotebookLM Enterprise API in preview for creating,
retrieving, listing, deleting and sharing notebooks. It requires a configured
Google Cloud project and NotebookLM Enterprise licenses. This is a future
enterprise connector, not the default consumer onboarding path.

Use it when a customer already operates NotebookLM Enterprise and wants the
agent to manage notebooks under its Google Cloud IAM controls.

## Decision

| Path | MVP fit | Authentication | Main use |
| --- | --- | --- | --- |
| Gemini File Search | High | Server API key plus our user isolation | Build the agent's native private notebook |
| NotebookLM Enterprise API | Later | Google Cloud OAuth/IAM and licenses | Connect an enterprise's managed notebooks |
| Consumer NotebookLM browser automation | Reject | Fragile browser session | No reliable product integration boundary |

## LangGraph workflows

### Ingest a source

```text
request import -> verify source permission -> show scope and cost
-> user approval -> import -> verify indexed document -> save evidence
```

### Ask the notebook

```text
question -> select user store -> retrieve scoped passages
-> answer with citations -> optionally prepare a separate action
```

### Delete a source

```text
request deletion -> identify exact indexed document -> user confirmation
-> delete from Gemini -> remove Neon reference -> save deletion evidence
```

## Required configuration for the MVP

- `GEMINI_API_KEY`
- one File Search store mapping per Privy user;
- source and deletion tables in Neon;
- ingestion size, file type and monthly budget limits;
- redaction rules for sensitive memories;
- acceptance tests proving cross-user isolation.

## Official references

- [Gemini File Search](https://ai.google.dev/gemini-api/docs/file-search)
- [File Search Documents API](https://ai.google.dev/api/file-search/documents)
- [NotebookLM Enterprise notebook API](https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks)
