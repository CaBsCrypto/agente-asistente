"use client";

import LanguageToggle, { useLocale } from "./language-toggle";
import BrandLockup from "./brand-lockup";
export { default } from "./home-experience";

const copy = {
  en: {
    nav: ["Product", "How it works", "Pilots", "Developers", "Integration Lab", "Waitlist"],
    guide: "Guide",
    signIn: "Sign in",
    eyebrow: "COMMERCE INFRASTRUCTURE FOR AI AGENTS",
    headline: <>Knows you. <em>Acts for you.</em></>,
    lede: "Carmelita is a personal AI agent with memory, permissions and a user-owned wallet that safely discovers, books, hires and pays for you.",
    primary: "Open Carmelita",
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
    langEyebrow: "AGENT INTELLIGENCE",
    langTitle: "The Lang ecosystem turns conversations into controlled actions.",
    langText: "Each layer has one responsibility. The model interprets; our deterministic controls still govern every real-world effect.",
    langStack: [
      ["LIVE", "LangChain", "Interprets English, Spanish and Portuguese requests into schema-validated plans.", "OpenRouter + Zod"],
      ["SHADOW", "LangGraph", "Tested reusable workflow kernel; connector-by-connector production cutover comes next.", "Checkpoints + approvals"],
      ["LATER", "LangSmith", "Will measure tool selection, failures and quality without receiving financial authority.", "Tracing + evaluations"],
      ["LOCAL", "Graphify", "Maps source code and dependencies for development; it is not user memory.", "Code graph + MCP"],
    ],
    langFlow: ["Request", "Plan", "Policy", "Privy", "Receipt"],
    langCta: "Read the technical architecture",

    pilotsEyebrow: "INITIAL ACTION NETWORK",
    langBoundary: "LLM = interpretation. Policy + Privy = authority.",
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
    guide: "Guía",
    signIn: "Ingresar",
    eyebrow: "INFRAESTRUCTURA DE COMERCIO PARA AGENTES DE IA",
    headline: <>Te conoce. <em>{"Act\u00faa por ti."}</em></>,
    lede: "Carmelita es un agente personal de IA con memoria, permisos y una wallet propiedad del usuario que descubre, reserva, contrata y paga por ti de forma segura.",
    primary: "Abrir Carmelita",
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
    langEyebrow: "INTELIGENCIA DEL AGENTE",
    langTitle: "El ecosistema Lang convierte conversaciones en acciones controladas.",
    langText: "Cada capa tiene una responsabilidad clara. El modelo interpreta; nuestras reglas siguen controlando cualquier efecto real.",
    langStack: [
      ["ACTIVO", "LangChain", "Interpreta solicitudes en espa\u00f1ol, ingl\u00e9s y portugu\u00e9s y produce planes estructurados.", "OpenRouter + Zod"],
      ["EN PRUEBAS", "LangGraph", "N\u00facleo reutilizable probado; el siguiente paso es migrar cada conector a producci\u00f3n.", "Checkpoints + aprobaciones"],
      ["DESPU\u00c9S", "LangSmith", "Medir\u00e1 selecci\u00f3n de herramientas, errores y calidad sin recibir autoridad financiera.", "Tracing + evaluations"],
      ["LOCAL", "Graphify", "Mapea el c\u00f3digo y sus dependencias para desarrollo; no es memoria del usuario.", "Code graph + MCP"],
    ],
    langFlow: ["Solicitud", "Plan", "Pol\u00edtica", "Privy", "Recibo"],
    langCta: "Ver arquitectura t\u00e9cnica",

    langBoundary: "LLM = interpretaci\u00f3n. Pol\u00edtica + Privy = autoridad.",
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
  pt: {
    nav: ["Produto", "Como funciona", "Pilotos", "Developers", "Laboratório", "Waitlist"],
    guide: "Guia",
    signIn: "Entrar",
    eyebrow: "INFRAESTRUTURA DE COMÉRCIO PARA AGENTES DE IA",
    headline: <>{"Conhece voc\u00ea."} <em>{"Age por voc\u00ea."}</em></>,
    lede: "Carmelita \u00e9 um agente pessoal de IA com mem\u00f3ria, permiss\u00f5es e uma wallet do usu\u00e1rio que descobre, reserva, contrata e paga por voc\u00ea com seguran\u00e7a.",
    primary: "Abrir Carmelita",
    secondary: "Testar demo ao vivo",
    boundary: "Identidade Privy + wallet Stellar do usuário · Somente Testnet · Sem fundos reais",
    review: "Ação pronta para revisão",
    reviewText: "Depositar 1 XLM em um vault público da DeFindex Testnet com autorização específica para a transação.",
    maximum: "Política máxima",
    action: "Esta ação",
    network: "Rede",
    approved: "Política aprovada",
    console: "Abrir prova Testnet",
    key: "Sua chave privada nunca chega ao nosso servidor.",
    controlEyebrow: "A CAMADA DE CONTROLE QUE FALTAVA",
    controlTitle: "Uma linguagem de ações para pessoas, agentes e empresas.",
    paths: [
      ["PARA PESSOAS", "Autonomia útil, limites firmes", "Entre uma vez, receba uma wallet e permita que o agente prepare ações sem autoridade ilimitada."],
      ["PARA DEVELOPERS", "Conecte em minutos", "Use o sandbox MCP público, conecte um agente pessoal ou crie um conector com permissões limitadas."],
      ["PARA EMPRESAS", "Prepare-se para os agentes", "Publique serviços estruturados via provider MCP, API, WebMCP ou integração empresarial guiada."],
    ],
    pathCta: "Explorar a plataforma para developers",
    lifecycleEyebrow: "CICLO DE VIDA DA AÇÃO",
    lifecycleTitle: "Toda ação sensível segue o mesmo contrato de segurança.",
    lifecycle: [
      ["01", "Descobrir", "Encontrar um serviço, oferta ou protocolo real."],
      ["02", "Preparar", "Fixar provider, valor, rede e expiração."],
      ["03", "Política", "Validar limites, categorias e destinos permitidos."],
      ["04", "Aprovar", "Mostrar a ação exata antes de solicitar uma assinatura."],
      ["05", "Executar", "Enviar uma única ação autorizada com proteção contra repetição."],
      ["06", "Verificar", "Guardar liquidação e entrega como evidências separadas."],
    ],
    langEyebrow: "INTELIG\u00caNCIA DO AGENTE",
    langTitle: "O ecossistema Lang transforma conversas em a\u00e7\u00f5es controladas.",
    langText: "Cada camada tem uma responsabilidade clara. O modelo interpreta; nossas regras continuam controlando qualquer efeito real.",
    langStack: [
      ["ATIVO", "LangChain", "Interpreta pedidos em portugu\u00eas, espanhol e ingl\u00eas e produz planos estruturados.", "OpenRouter + Zod"],
      ["EM TESTE", "LangGraph", "N\u00facleo reutiliz\u00e1vel testado; o pr\u00f3ximo passo \u00e9 migrar cada conector para produ\u00e7\u00e3o.", "Checkpoints + aprova\u00e7\u00f5es"],
      ["DEPOIS", "LangSmith", "Vai medir sele\u00e7\u00e3o de ferramentas, erros e qualidade sem receber autoridade financeira.", "Tracing + evaluations"],
      ["LOCAL", "Graphify", "Mapeia o c\u00f3digo e suas depend\u00eancias para desenvolvimento; n\u00e3o \u00e9 mem\u00f3ria do usu\u00e1rio.", "Code graph + MCP"],
    ],
    langFlow: ["Pedido", "Plano", "Pol\u00edtica", "Privy", "Recibo"],
    langCta: "Ver arquitetura t\u00e9cnica",
    langBoundary: "LLM = interpreta\u00e7\u00e3o. Pol\u00edtica + Privy = autoridade.",

    pilotsEyebrow: "REDE INICIAL DE AÇÕES",
    pilotsTitle: "Quatro pilotos. Uma arquitetura reutilizável.",
    pilots: [
      ["PRONTO PARA VALIDAR", "DeFindex", "Preparar ações XLM e USDC, assinar com Privy e verificar na Stellar Testnet."],
      ["PILOTO COM PARCEIRO", "UNBLCK", "Descobrir programas, solicitar acesso e concluir onboarding assistido."],
      ["PILOTO COM PARCEIRO", "ArcusX", "Transformar um briefing e orçamento em um trabalho rastreável com evidência de entrega."],
      ["LEITURA AO VIVO", "Travala", "Pesquisar inventário real de viagens via MCP antes de habilitar reservas pagas."],
    ],
    walletEyebrow: "NÃO CUSTODIAL POR DESIGN",
    walletTitle: "O agente propõe. A política decide. A wallet assina.",
    walletText: "Identidade, autorização e liquidação permanecem separadas para que nenhum componente receba autoridade ilimitada.",
    stages: [["DESCOBRIR", "MCP + WebMCP"], ["CONTROLAR", "Intent + política"], ["AUTORIZAR", "Humano ou delegado"], ["VERIFICAR", "Recibo + entrega"]],
    partnerEyebrow: "CONSTRUA CONOSCO",
    partnerTitle: "Torne uma ação útil do seu negócio pronta para agentes.",
    partnerText: "Comece em sandbox ou Testnet, mantenha a custódia com o usuário e avance somente com evidência reproduzível.",
    partnerCta: "Abrir portal de developers",
    footer: "Construído na América Latina para uma economia global de agentes.",
  },
};

export function LegacyHome() {
  const { locale, setLocale } = useLocale();
  const t = copy[locale];

  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="#top"><BrandLockup /></a>
        <div className="nav-links">
          <a href="#product">{t.nav[0]}</a><a href="#lifecycle">{t.nav[1]}</a><a href="#pilots">{t.nav[2]}</a><a href="/guide">{t.guide}</a><a href="/developers">{t.nav[3]}</a><a href="/connections">{t.nav[4]}</a><a href="/waitlist">{t.nav[5]}</a>
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

      <section className="lang-ecosystem section shell" id="intelligence">
        <div className="lang-heading"><p className="eyebrow">{t.langEyebrow}</p><h2>{t.langTitle}</h2><p>{t.langText}</p></div>
        <div className="lang-stack">{t.langStack.map((layer, index) => <article key={layer[1]} className={`lang-layer layer-${index}`}>
          <header><span>{layer[0]}</span><code>{layer[3]}</code></header><h3>{layer[1]}</h3><p>{layer[2]}</p>
        </article>)}</div>
        <div className="lang-runtime" aria-label={t.langFlow.join(" to ")}>{t.langFlow.map((step) => <span key={step}>{step}</span>)}</div>
        <p className="lang-boundary">{t.langBoundary}</p>
        <a className="section-link" href="https://github.com/CaBsCrypto/agente-asistente/blob/main/docs/lang-ecosystem.md">{t.langCta} {"\u2192"}</a>
      </section>

      <section className="section shell" id="pilots"><p className="eyebrow">{t.pilotsEyebrow}</p><h2>{t.pilotsTitle}</h2><div className="pilots">{t.pilots.map((pilot, index) => <article className={index === 0 ? "hot" : ""} key={pilot[1]}><span>{pilot[0]}</span><h3>{pilot[1]}</h3><p>{pilot[2]}</p></article>)}</div></section>

      <section className="wallet shell"><div><p className="eyebrow">{t.walletEyebrow}</p><h2>{t.walletTitle}</h2><p>{t.walletText}</p></div><div>{t.stages.map((stage) => <span key={stage[0]}>{stage[0]} <small>{stage[1]}</small></span>)}</div></section>

      <section className="section shell" id="partners"><div className="partner"><div><p className="eyebrow">{t.partnerEyebrow}</p><h2>{t.partnerTitle}</h2><p>{t.partnerText}</p></div><a href="/developers">{t.partnerCta}</a></div></section>
      <footer className="shell"><span className="brand"><BrandLockup /></span><p>{t.footer}</p></footer>
    </main>
  );
}