# Stellar 8004 identity and reputation

Status: **registration profile prepared; not registered on-chain**.

Stellar 8004 provides registries for agent identity, reputation and validation.
It can make agent-assistant discoverable as a service with an owner wallet,
public endpoint, capabilities and payment protocols.

## Current preparation

- Draft profile: `/agent-registration-draft.json`.
- MCP discovery: `/.well-known/mcp.json`.
- MCP endpoint: `/api/mcp`.
- x402 is described as Testnet-validated.
- MPP is described as discovery-only.
- No registry ID, owner wallet or reputation claim is published yet.

The draft filename and status are deliberate. It must not be presented as an
official registered identity until an on-chain transaction is verified.

## Registration decision checklist

The founder must choose:

1. Registration network.
2. Long-lived owner wallet.
3. Public metadata that can safely remain discoverable.
4. Which capabilities have reproducible proof.
5. Whether x402 and MPP support are advertised separately.
6. The validation evidence and update/revocation procedure.

Recommended first registration:

- owner: a dedicated project identity wallet, not a user's personal agent wallet;
- endpoint: the existing public MCP discovery document;
- capabilities: discovery, policy evaluation and Testnet x402 proof;
- reputation: begin empty and accumulate verifiable client feedback;
- MPP: do not claim execution until a capped payment is completed.

Official references:

- https://stellar8004.com/
- https://developers.stellar.org/meetings/2026/04/23
