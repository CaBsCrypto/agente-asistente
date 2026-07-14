import Link from "next/link";

const sandboxTools = [
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
      <h1>Use our agent, publish a service, or connect an external tool.</h1>
      <p className="lede">
        The gateway now separates a public commerce sandbox, an authenticated
        personal-agent MCP and a scoped provider-admin MCP. Payment settlement
        remains simulated until the first Privy-signed Stellar Testnet proof.
      </p>

      <section>
        <h2>Choose your path</h2>
        <ul>
          <li>
            <strong>Use agent-assistant:</strong> connect to the personal MCP
            with the user&apos;s authority.
          </li>
          <li>
            <strong>Publish services:</strong> use a scoped provider key to
            manage offers that agents can discover.
          </li>
          <li>
            <strong>Connect your product:</strong> expose an API or MCP tool
            that our outbound connector can call after consent.
          </li>
        </ul>
        <p>
          <a href="https://github.com/CaBsCrypto/agente-asistente/blob/main/docs/developer-guide.md">
            Developer guide
          </a>
          {" | "}
          <a href="https://github.com/CaBsCrypto/agente-asistente/blob/main/docs/architecture.md">
            Architecture
          </a>
          {" | "}
          <a href="https://github.com/CaBsCrypto/agente-asistente/blob/main/docs/mcp-gateway.md">
            MCP gateway guide
          </a>
          {" | "}
          <a href="https://github.com/CaBsCrypto/agente-asistente">
            GitHub
          </a>
        </p>
      </section>

      <section>
        <h2>MCP gateway endpoints</h2>
        <p><strong>Commerce sandbox</strong></p>
        <pre>https://agente-asistente.vercel.app/api/mcp</pre>
        <p><strong>Personal agent (Privy bearer)</strong></p>
        <pre>https://agente-asistente.vercel.app/api/mcp/agent</pre>
        <p><strong>Service provider admin (scoped provider key)</strong></p>
        <pre>https://agente-asistente.vercel.app/api/mcp/provider</pre>
      </section>

      <section>
        <h2>Sandbox client configuration</h2>
        <pre>{clientConfig}</pre>
        <h2>Commerce tools</h2>
        <div className="tool-list">
          {sandboxTools.map((tool) => <code key={tool}>{tool}</code>)}
        </div>
      </section>

      <section>
        <h2>Security contract</h2>
        <ul>
          <li>Personal and provider principals are isolated.</li>
          <li>Provider keys are hashed and scoped.</li>
          <li>Publishing is separate from drafting an offer.</li>
          <li>Creating an intent never moves funds.</li>
          <li>The same idempotency key returns the original intent.</li>
          <li>Repeated execution returns the original receipt.</li>
          <li>
            Public personal-agent access still requires OAuth 2.1, consent,
            rotation and revocation before launch.
          </li>
        </ul>
      </section>

      <Link className="doc-back" href="/">Back to the product</Link>
    </main>
  );
}
