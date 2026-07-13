const tools=["search_offers","get_offer","create_intent","evaluate_policy","demo_authorize_intent","execute_authorized_intent","get_receipt"];
export default function Developers(){return <main className="dev shell"><a className="brand" href="/"><b>AA</b>agent-assistant</a><p className="eyebrow">DEVELOPER PLATFORM</p><h1>Connect any compatible agent to our commerce control layer.</h1><p className="lede">The public sandbox runs a remote MCP over Streamable HTTP. It demonstrates the complete transaction lifecycle without moving real funds.</p><section><h2>Remote MCP endpoint</h2><pre>https://agente-asistente.vercel.app/api/mcp</pre><h2>Client configuration</h2><pre>{`{
  "mcpServers": {
    "agent-assistant": {
      "url": "https://agente-asistente.vercel.app/api/mcp"
    }
  }
}`}</pre></section><section><h2>Available tools</h2><div className="tool-list">{tools.map(t=><code key={t}>{t}</code>)}</div></section><section><h2>Security contract</h2><ul><li>Creating an intent never moves funds.</li><li>Policy is evaluated before authorization.</li><li>Demo authorization expires after five minutes.</li><li>The same idempotency key returns the original intent.</li><li>Repeated execution returns the original receipt.</li><li>Production will require OAuth, wallet signatures and durable storage.</li></ul></section><a className="doc-back" href="/">Back to the product</a></main>}
