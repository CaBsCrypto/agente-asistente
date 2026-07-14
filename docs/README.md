# Documentation

This directory is the source of truth for operating, demonstrating and extending agent-assistant.

## Choose a path

### Product and fundraising

1. Read the [current product status](product-status.md).
2. Rehearse the [90-second live demo](live-demo.md).
3. Use only claims marked **Live** or **Sandbox** in external materials.
4. Use the [CoinMarketCap pilot brief](coinmarketcap-partner-pilot.md) for outreach.

### Developers and integrations

1. Read the [developer guide](developer-guide.md).
2. Review the [architecture diagrams](architecture.md).
3. Read the [bidirectional MCP gateway](mcp-gateway.md).
4. Read the [MCP integration guide](mcp-integration.md).
5. Read the [Privy + Stellar architecture](privy-stellar-testnet.md).
6. Send the [new product integration prompt](NEW_PRODUCT_INTEGRATION_AGENT_PROMPT.md) to an implementation agent or partner engineer.

### Founder operations

1. Use [admin operations](admin-operations.md) for lead and pilot management.
2. Use [waitlist operations](waitlist-operations.md) for Neon setup and YC metrics.

## Shared status language

| Status | Meaning |
| --- | --- |
| **Live** | Deployed and verified against a real external system |
| **Ready to validate** | Implemented but missing a complete user acceptance test |
| **Sandbox** | Working product proof with simulated execution or settlement |
| **Planned** | Researched or designed, not implemented |

Every integration should document five separate facts:

1. **Discovery:** can the agent find the tool or provider?
2. **Authentication:** has the user granted access?
3. **Execution:** can the tool perform the intended action?
4. **Settlement:** was money moved and verified?
5. **Fulfillment:** was the product or service delivered?

Passing one stage never implies that later stages work.

## Maintenance rules

- Update [product-status.md](product-status.md) whenever a capability changes.
- Add a dated verification note and evidence for every **Live** claim.
- Never call partner outreach an integration.
- Never call a simulated receipt an on-chain payment.
- Keep secrets and real access tokens out of documentation and screenshots.
- Run the commands in the root README before publishing code-related changes.
