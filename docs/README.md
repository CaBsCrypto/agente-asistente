# Documentation

This directory is the source of truth for operating, demonstrating and extending agent-assistant.

## New users

1. Open the [public new user guide](https://agente-asistente.vercel.app/guide).
2. Keep the guide beside the authenticated agent.
3. Follow the wallet, Testnet XLM, USDC trustline and DeFindex sequence.
4. Use [the repository manual](user-guide.md) when a markdown version is needed.

## Choose a path

### Product and fundraising

1. Read the [current product status](product-status.md).
2. Rehearse the [90-second live demo](live-demo.md).
3. Complete the [YC application answer bank](yc-application.md).
4. Follow the [YC closeout roadmap](yc-closeout-roadmap.md).
5. Execute the [YC seven-day closeout plan](yc-seven-day-plan.md).
6. Track verified proof in the [YC evidence ledger](yc-evidence-ledger.md).
7. Use only claims marked **Live** or **Sandbox** in external materials.
8. Use the [CoinMarketCap pilot brief](coinmarketcap-partner-pilot.md) for outreach.
9. Read the [Personal Execution Vault guide](personal-execution-vault.md) for user memory, policies and decision evidence.
10. Use the [acceptance testing guide](acceptance-testing.md) before claiming an integration works.
11. Review the [graph memory and project map](graph-memory.md) to validate topic-scoped memory.

Start with the two maps, then drill into a specific surface.

1. Read the [developer guide](developer-guide.md).
2. Read the [API & integration reference](api-reference.md) — every HTTP route, MCP tool, outbound connector, auth model and environment variable, sourced from the code.
3. Review the [architecture diagrams](architecture.md).

Runtime and orchestration:

4. Review the [Lang ecosystem map](lang-ecosystem.md), [reusable LangGraph engine](reusable-workflow-engine.md) and [LangChain orchestration boundary](langchain-orchestration.md).
5. Read the [bidirectional MCP gateway](mcp-gateway.md) and the [MCP integration guide](mcp-integration.md).
6. Read the [browser-assisted Connection Center](connection-center.md).

Per-integration deep dives:

7. [UNBLCK Agent API integration](unblck-agent-api.md) (Live) and the [Soroswap Testnet flow](soroswap-testnet.md).
8. [Privy + Stellar architecture](privy-stellar-testnet.md) and the [DeFindex Testnet guide](defindex-testnet.md) (Live XLM proof).
9. [x402 + Privy Testnet payment](x402-privy-testnet.md) (Live proof).
10. [Telegram bot](telegram-bot.md) — chat-first bridge + signing Mini App, with the go-live checklist.
11. [Testnet Autopilot](testnet-autopilot.md), [OpenZeppelin Stellar Channels](openzeppelin-stellar-channels.md), [MPP Router](mpp-router.md) and the [Stellar 8004 plan](stellar-8004.md).

Extend and validate:

12. Review the [Gemini notebook integration](gemini-notebook-integration.md) before adding personal knowledge sources.
13. Run the [acceptance testing workflow](acceptance-testing.md) before and after deployment.
14. Send the [new product integration prompt](NEW_PRODUCT_INTEGRATION_AGENT_PROMPT.md) to an implementation agent or partner engineer.

For the illustrated single-page tour, open the [visual product & architecture overview](overview.html) in a browser.

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
