import Link from "next/link";

const tools = [
  "search_offers",
  "get_offer",
  "create_intent",
  "evaluate_policy",
  "demo_authorize_intent",
  "execute_authorized_intent",
  "get_receipt",
];

const clientConfig = [
  "{",
  '  "mcpServers": {',
  '    "agent-assistant": {',
  '      "url": "https://agente-asistente.vercel.app/api/mcp"',
  "    }",
  "  }",
  "}",
].join("\n");

export default function Developers() {
  return (
    <main className="dev shell">
      <Link className="brand" href="/">
        <b>AA</b>agent-assistant
      </Link>
      <p className="eyebrow">DEVELOPER PLATFORM</p>
      <h1>Connect an agent, application or merchant to the control layer.</h1>
      <p className="lede">
        Start with the public remote MCP sandbox, inspect the architecture, or
        implement one scoped outbound connector. Payment settlement remains
        simulated until the first Privy-signed Stellar Testnet transaction.
      </p>

      <section>
        <h2>Choose your path</h2>
        <ul>
          <li><strong>Agent developer:</strong> call our seven inbound MCP tools.</li>
          <li><strong>Frontend developer:</strong> use the commerce HTTP sandbox.</li>
          <li>
            <strong>Provider or merchant:</strong> expose an API or MCP tool and
            define authentication, execution and fulfillment separately.
          </li>
        </ul>
        <p>
          <a href="https://github.com/CaBsCrypto/agente-asistente/blob/main/docs/developer-guide.md">
            Complete developer guide
          </a>
          {" · "}
          <a href="https://github.com/CaBsCrypto/agente-asistente/blob/main/docs/architecture.md">
            Architecture and flows
          </a>
          {" · "}
          <a href="https://github.com/CaBsCrypto/agente-asistente">
            GitHub repository
          </a>
        </p>
      </section>

      <section>
        <h2>Remote MCP endpoint</h2>
        <pre>https://agente-asistente.vercel.app/api/mcp</pre>
        <h2>Client configuration</h2>
        <pre>{clientConfig}</pre>
      </section>

      <section>
        <h2>Available tools</h2>
        <div className="tool-list">
          {tools.map((tool) => <code key={tool}>{tool}</code>)}
        </div>
      </section>

      <section>
        <h2>Security contract</h2>
        <ul>
          <li>Creating an intent never moves funds.</li>
          <li>Policy is evaluated before authorization.</li>
          <li>Demo authorization expires after five minutes.</li>
          <li>The same idempotency key returns the original intent.</li>
          <li>Repeated execution returns the original receipt.</li>
          <li>
            Production mutation requires OAuth, identity, wallet approval and
            durable evidence.
          </li>
        </ul>
      </section>

      <Link className="doc-back" href="/">Back to the product</Link>
    </main>
  );
}
