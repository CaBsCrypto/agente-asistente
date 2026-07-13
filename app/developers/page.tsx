const tools=["search_offers","get_offer","create_intent","evaluate_policy","demo_authorize_intent","execute_authorized_intent","get_receipt"];
export default function Developers(){return <main className="dev shell"><a className="brand" href="/"><b>AA</b>agente-asistente</a><p className="eyebrow">INTEGRACIÓN PARA DESARROLLADORES</p><h1>Conecta cualquier agente a nuestra capa de comercio.</h1><p className="lede">El servidor usa MCP remoto sobre Streamable HTTP. Esta versión es pública, demostrativa y no mueve fondos.</p><section><h2>Endpoint</h2><pre>https://agente-asistente.vercel.app/api/mcp</pre><h2>Configuración</h2><pre>{`{
  "mcpServers": {
    "agente-asistente": {
      "url": "https://agente-asistente.vercel.app/api/mcp"
    }
  }
}`}</pre></section><section><h2>Herramientas</h2><div className="tool-list">{tools.map(t=><code key={t}>{t}</code>)}</div></section><section><h2>Contrato de seguridad</h2><ul><li>Crear una intención nunca mueve fondos.</li><li>La política se evalúa antes de autorizar.</li><li>La autorización demo vence en cinco minutos.</li><li>La misma clave idempotente devuelve la misma intención.</li><li>Repetir una ejecución devuelve el mismo recibo.</li><li>Producción requerirá OAuth, wallet y almacenamiento durable.</li></ul></section><a className="doc-back" href="/">Volver al producto</a></main>}
