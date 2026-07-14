"use client";

import LanguageToggle, { useLocale } from "./language-toggle";

const copy = {
  en: {
    nav: ["Product", "How it works", "Pilots", "Developers", "Integration Lab", "Waitlist"],
    signIn: "Sign in",
    eyebrow: "COMMERCE INFRASTRUCTURE FOR AI AGENTS",
    headline: <>Agents can take action. <em>You stay in control.</em></>,
    lede: "A non-custodial control layer for agents that discover, book, hire and pay under policies defined by real people.",
    primary: "Open your agent",
    secondary: "Try the live demo",
    boundary: "Privy identity + user-owned Stellar wallet · Testnet only · No real funds enabled",
    review: "Action ready for review",
    reviewText: "Deposit 1 XLM into a public DeFindex Testnet vault with a transaction-specific approval.",
    maximum: "Maximum policy",
    action: "This action",
    network: "Network",
    approved: "Policy checks passed",
    console: "Open Testnet proof",
    key: "Your private key never reaches our server.",
    controlEyebrow: "THE MISSING CONTROL PLANE",
    controlTitle: "One action language for people, agents and businesses.",
    paths: [
      ["FOR PEOPLE", "Useful autonomy, hard limits", "Sign in once, receive a wallet and let the agent prepare actions without unrestricted authority."],
      ["FOR DEVELOPERS", "Connect in minutes", "Use the public MCP sandbox, connect a personal agent or build a scoped outbound connector."],
      ["FOR BUSINESSES", "Become agent-ready", "Publish structured services through provider MCP, API, WebMCP or a guided enterprise integration."],
    ],
    pathCta: "Explore the developer platform",
    lifecycleEyebrow: "THE ACTION LIFECYCLE",
    lifecycleTitle: "Every sensitive action follows the same safety contract.",
    lifecycle: [
      ["01", "Discover", "Find a real service, offer or protocol."],
      ["02", "Prepare", "Freeze provider, amount, network and expiry."],
      ["03", "Policy", "Check limits, categories and approved destinations."],
      ["04", "Approve", "Show the exact action before requesting a signature."],
      ["05", "Execute", "Submit one authorized action with replay protection."],
      ["06", "Verify", "Store settlement and fulfillment as separate evidence."],
    ],
    pilotsEyebrow: "INITIAL ACTION NETWORK",
    pilotsTitle: "Four pilots. One reusable architecture.",
    pilots: [
      ["READY TO VALIDATE", "DeFindex", "Prepare XLM and USDC vault actions, sign through Privy and verify on Stellar Testnet."],
      ["PARTNER PILOT", "UNBLCK", "Discover programs, request access and complete assisted onboarding."],
      ["PARTNER PILOT", "ArcusX", "Turn a brief and budget into a trackable job with delivery evidence."],
      ["READ-ONLY LIVE", "Travala", "Search real travel inventory through MCP before enabling paid booking."],
    ],
    walletEyebrow: "NON-CUSTODIAL BY DESIGN",
    walletTitle: "The agent proposes. Policy decides. The wallet signs.",
    walletText: "Identity, authorization and settlement remain separate so no single component receives unlimited authority.",
    stages: [["DISCOVER", "MCP + WebMCP"], ["CONTROL", "Intent + policy"], ["AUTHORIZE", "Human or delegated"], ["VERIFY", "Receipt + fulfillment"]],
    partnerEyebrow: "BUILD WITH US",
    partnerTitle: "Make one useful business action agent-ready.",
    partnerText: "Start in sandbox or Testnet, keep custody with the user and graduate only after reproducible evidence.",
    partnerCta: "Open developer portal",
    footer: "Built in Latin America for a global agent economy.",
  },
  es: {
    nav: ["Producto", "Cómo funciona", "Pilotos", "Developers", "Laboratorio", "Waitlist"],
    signIn: "Ingresar",
    eyebrow: "INFRAESTRUCTURA DE COMERCIO PARA AGENTES DE IA",
    headline: <>Los agentes pueden actuar. <em>Tú mantienes el control.</em></>,
    lede: "Una capa de control no custodial para agentes que descubren, reservan, contratan y pagan bajo políticas definidas por personas reales.",
    primary: "Abrir mi agente",
    secondary: "Probar demo en vivo",
    boundary: "Identidad Privy + wallet Stellar del usuario · Solo Testnet · Sin fondos reales",
    review: "Acción lista para revisar",
    reviewText: "Depositar 1 XLM en un vault público de DeFindex Testnet con una autorización específica.",
    maximum: "Política máxima",
    action: "Esta acción",
    network: "Red",
    approved: "Política aprobada",
    console: "Abrir prueba Testnet",
    key: "Tu clave privada nunca llega a nuestro servidor.",
    controlEyebrow: "LA CAPA DE CONTROL QUE FALTABA",
    controlTitle: "Un lenguaje de acciones para personas, agentes y empresas.",
    paths: [
      ["PARA PERSONAS", "Autonomía útil, límites firmes", "Ingresa una vez, recibe una wallet y permite que el agente prepare acciones sin autoridad ilimitada."],
      ["PARA DEVELOPERS", "Conecta en minutos", "Usa el sandbox MCP público, conecta un agente personal o construye un conector con permisos limitados."],
      ["PARA EMPRESAS", "Prepárate para los agentes", "Publica servicios estructurados mediante provider MCP, API, WebMCP o una integración empresarial guiada."],
    ],
    pathCta: "Explorar plataforma para developers",
    lifecycleEyebrow: "CICLO DE VIDA DE UNA ACCIÓN",
    lifecycleTitle: "Cada acción sensible sigue el mismo contrato de seguridad.",
    lifecycle: [
      ["01", "Descubrir", "Encontrar un servicio, oferta o protocolo real."],
      ["02", "Preparar", "Fijar proveedor, monto, red y expiración."],
      ["03", "Política", "Validar límites, categorías y destinos permitidos."],
      ["04", "Aprobar", "Mostrar la acción exacta antes de solicitar una firma."],
      ["05", "Ejecutar", "Enviar una sola acción autorizada y resistente a duplicados."],
      ["06", "Verificar", "Guardar liquidación y entrega como evidencias separadas."],
    ],
    pilotsEyebrow: "RED INICIAL DE ACCIONES",
    pilotsTitle: "Cuatro pilotos. Una arquitectura reutilizable.",
    pilots: [
      ["LISTO PARA VALIDAR", "DeFindex", "Preparar acciones XLM y USDC, firmar mediante Privy y verificar en Stellar Testnet."],
      ["PILOTO CON PARTNER", "UNBLCK", "Descubrir programas, solicitar acceso y completar onboarding asistido."],
      ["PILOTO CON PARTNER", "ArcusX", "Convertir un brief y presupuesto en un trabajo con evidencia de entrega."],
      ["LECTURA EN VIVO", "Travala", "Buscar inventario real de viajes mediante MCP antes de habilitar reservas pagadas."],
    ],
    walletEyebrow: "NO CUSTODIAL POR DISEÑO",
    walletTitle: "El agente propone. La política decide. La wallet firma.",
    walletText: "Identidad, autorización y liquidación permanecen separadas para evitar autoridad ilimitada en un solo componente.",
    stages: [["DESCUBRIR", "MCP + WebMCP"], ["CONTROLAR", "Intent + política"], ["AUTORIZAR", "Humano o delegado"], ["VERIFICAR", "Recibo + entrega"]],
    partnerEyebrow: "CONSTRUYE CON NOSOTROS",
    partnerTitle: "Convierte una acción útil de tu negocio en una acción para agentes.",
    partnerText: "Comienza en sandbox o Testnet, conserva la custodia en el usuario y avanza solamente con evidencia reproducible.",
    partnerCta: "Abrir portal de developers",
    footer: "Construido en Latinoamérica para una economía global de agentes.",
  },
};

export default function Home() {
  const { locale, setLocale } = useLocale();
  const t = copy[locale];

  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="#top"><b>AA</b>agent-assistant</a>
        <div className="nav-links">
          <a href="#product">{t.nav[0]}</a><a href="#lifecycle">{t.nav[1]}</a><a href="#pilots">{t.nav[2]}</a><a href="/developers">{t.nav[3]}</a><a href="/connections">{t.nav[4]}</a><a href="/waitlist">{t.nav[5]}</a>
          <LanguageToggle locale={locale} onChange={setLocale} compact />
          <a className="nav-login" href="/login">{t.signIn}</a>
        </div>
      </nav>

      <section className="hero shell" id="top">
        <div>
          <p className="eyebrow">{t.eyebrow}</p><h1>{t.headline}</h1><p className="lede">{t.lede}</p>
          <div className="actions"><a href="/agent">{t.primary}</a><a href="/demo">{t.secondary}</a></div><small>{t.boundary}</small>
        </div>
        <aside><header><span>{t.review}</span><b>TESTNET</b></header><p>{t.reviewText}</p><dl><div><dt>{t.maximum}</dt><dd>1 XLM</dd></div><div><dt>{t.action}</dt><dd>1 XLM</dd></div><div><dt>{t.network}</dt><dd>Stellar</dd></div></dl><strong className="approved">{t.approved}</strong><a className="hero-demo-link" href="/agent">{t.console}</a><small>{t.key}</small></aside>
      </section>

      <section className="section shell" id="product"><p className="eyebrow">{t.controlEyebrow}</p><h2>{t.controlTitle}</h2><div className="cards">{t.paths.map((path) => <article key={path[0]}><span>{path[0]}</span><h3>{path[1]}</h3><p>{path[2]}</p></article>)}</div><a className="section-link" href="/developers">{t.pathCta} →</a></section>

      <section className="dark" id="lifecycle"><div className="shell"><p className="eyebrow">{t.lifecycleEyebrow}</p><h2>{t.lifecycleTitle}</h2><div className="flow">{t.lifecycle.map((step) => <div key={step[0]}><b>{step[0]}</b><strong>{step[1]}</strong><small>{step[2]}</small></div>)}</div></div></section>

      <section className="section shell" id="pilots"><p className="eyebrow">{t.pilotsEyebrow}</p><h2>{t.pilotsTitle}</h2><div className="pilots">{t.pilots.map((pilot, index) => <article className={index === 0 ? "hot" : ""} key={pilot[1]}><span>{pilot[0]}</span><h3>{pilot[1]}</h3><p>{pilot[2]}</p></article>)}</div></section>

      <section className="wallet shell"><div><p className="eyebrow">{t.walletEyebrow}</p><h2>{t.walletTitle}</h2><p>{t.walletText}</p></div><div>{t.stages.map((stage) => <span key={stage[0]}>{stage[0]} <small>{stage[1]}</small></span>)}</div></section>

      <section className="section shell" id="partners"><div className="partner"><div><p className="eyebrow">{t.partnerEyebrow}</p><h2>{t.partnerTitle}</h2><p>{t.partnerText}</p></div><a href="/developers">{t.partnerCta}</a></div></section>
      <footer className="shell"><span className="brand"><b>AA</b>agent-assistant</span><p>{t.footer}</p></footer>
    </main>
  );
}