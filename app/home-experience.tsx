"use client";

import Link from "next/link";
import BrandLockup from "./brand-lockup";
import IntegrationRecommendationForm from "./integration-recommendation-form";
import LanguageToggle, { useLocale } from "./language-toggle";

const copy = {
  en: {
    nav: ["What it does", "Integrations", "How it works", "For business", "Developers"],
    enter: "Enter",
    eyebrow: "YOUR PERSONAL EXECUTION AGENT",
    title: <>Ask Carmelita.<br /><em>She prepares it. You decide.</em></>,
    lede: "Tell Carmelita what you need. It remembers your preferences, finds the right service and prepares the action. You approve what matters.",
    primary: "Start with Carmelita",
    secondary: "See what it can do",
    trust: ["Your wallet", "Your rules", "Clear receipts"],
    userMessage: "Book a workspace for next Friday.",
    thinking: "I found availability at UNBLCK.",
    actionReady: "Ready for your review",
    actionTitle: "Innovation Hub Day Pass",
    actionMeta: "Friday, July 24 \u00b7 1 credit",
    review: "Review and book",
    never: "Carmelita never confirms a sensitive action outside your rules.",
    possibilitiesEyebrow: "ONE CONVERSATION, REAL OUTCOMES",
    possibilitiesTitle: "Less app switching. More things done.",
    possibilities: [
      ["BOOK", "Reserve places and services", "Find availability, compare options and confirm with your connected account."],
      ["TRAVEL", "Plan the next move", "Search stays, activities and transport while keeping your preferences in context."],
      ["MONEY", "Prepare wallet actions", "Review payments and onchain actions with limits, approval and transaction evidence."],
      ["WORK", "Hire and organize", "Turn an idea into a brief, task or project and follow it through delivery."],
    ],
    nameEyebrow: "WHY CARMELITA",
    nameTitle: "The name is also our operating model.",
    nameText: "Nine letters define what every useful action must preserve.",
    nameLetters: [["C", "Context"], ["A", "Actions"], ["R", "Rules"], ["M", "Memory"], ["E", "Execution"], ["L", "Limits"], ["I", "Identity"], ["T", "Transactions"], ["A", "Audit"]],
    memoryEyebrow: "PERSONAL, NOT GENERIC",
    memoryTitle: "It learns your way of doing things.",
    memoryText: "Carmelita uses only the memories, preferences and rules you choose to save. Every action starts with your context and ends inside your limits.",
    memories: ["Quiet workspaces", "Window seat", "Max. 50 USDC", "Always ask before paying"],
    controlTitle: "You stay in control",
    controls: ["Review before sensitive actions", "Per-action and daily limits", "Revoke connections anytime"],
    howEyebrow: "HOW IT WORKS",
    howTitle: "From message to verified result.",
    steps: [
      ["01", "Ask naturally", "Write in English, Spanish or Portuguese."],
      ["02", "Review the plan", "See the provider, cost, account and exact consequence."],
      ["03", "Approve and verify", "Carmelita executes once and returns the receipt."],
    ],
    forBusiness: "FOR BUSINESSES",
    businessTitle: "Let personal agents use your service.",
    businessText: "Publish an action such as search, quote, reserve or order through an API, MCP or guided connector.",
    businessCta: "Make your business agent-ready",
    forDevelopers: "FOR DEVELOPERS",
    developerTitle: "Connect a tool. Keep the authority scoped.",
    developerText: "Use structured intents, policy checks, approvals and evidence without rebuilding the execution layer.",
    developerCta: "Explore developer platform",
    proofEyebrow: "WORKING PROOF",
    proofTitle: "Real integrations, honest boundaries.",
    proofs: [
      ["Stellar", "Testnet transactions"],
      ["UNBLCK", "Partner booking API"],
      ["DeFindex", "Vault action flow"],
      ["Travala", "Live travel search"],
    ],
    integrationsEyebrow: "CONNECTED AND VERIFIED",
    integrationsTitle: "Useful services Carmelita can already reach.",
    integrationsText: "Each status describes what has actually been tested. Discovery, signing and execution remain separate capabilities.",
    integrations: [
      ["LIVE", "UNBLCK", "Book and cancel workspace days", "Verified through the partner booking API"],
      ["TESTNET", "DeFindex", "Deposit XLM into a public vault", "Privy-signed transaction confirmed on Stellar"],
      ["TESTNET", "Stellar x402", "Pay 0.01 USDC without duplicate charges", "Settlement and replay-safe receipt verified"],
      ["READ ONLY", "Travala", "Search real hotel inventory", "Live public Travel MCP results"],
      ["READ ONLY", "CoinGecko + CMC", "Quote markets and maintain a watchlist", "Live prices with automatic fallback"],
    ],
    connectionsCta: "Explore the integration lab",
    integrationForm: {
      eyebrow: "SHAPE THE ROADMAP",
      title: "Recommend an integration",
      text: "Tell us which service Carmelita should connect next and what you want to accomplish with it.",
      nameLabel: "Application or service",
      namePlaceholder: "Google Calendar, Slack, Rappi...",
      emailLabel: "Your email",
      emailPlaceholder: "you@company.com",
      useCaseLabel: "What should Carmelita do?",
      useCasePlaceholder: "For example: find a free slot and schedule a meeting.",
      consent: "Carmelita may contact me about this integration request.",
      submit: "Recommend integration",
      sending: "Saving recommendation...",
      success: "Recommendation saved. We will use it to prioritize the roadmap.",
      duplicate: "We already have this recommendation from you. Thank you.",
      error: "We could not save it right now. Please try again.",
    },
    finalTitle: "What should Carmelita handle first?",
    finalText: "Create your agent, connect what you use and start in Testnet with no real funds.",
    finalCta: "Open Carmelita",
    waitlist: "Join the waitlist",
    footer: "Built in Latin America for a global agent economy.",
  },
  es: {
    nav: ["Qu\u00e9 puede hacer", "Integraciones", "C\u00f3mo funciona", "Para empresas", "Developers"],
    enter: "Ingresar",
    eyebrow: "TU AGENTE PERSONAL DE EJECUCI\u00d3N",
    title: <>{"P\u00eddeselo a Carmelita."}<br /><em>{"Ella lo prepara. T\u00fa decides."}</em></>,
    lede: "Dile a Carmelita lo que necesitas. Recuerda tus preferencias, encuentra el servicio indicado y prepara la acci\u00f3n. T\u00fa apruebas lo importante.",
    primary: "Comenzar con Carmelita",
    secondary: "Ver qu\u00e9 puede hacer",
    trust: ["Tu wallet", "Tus reglas", "Recibos claros"],
    userMessage: "Reserva un espacio de trabajo para el pr\u00f3ximo viernes.",
    thinking: "Encontr\u00e9 disponibilidad en UNBLCK.",
    actionReady: "Lista para tu revisi\u00f3n",
    actionTitle: "Pase diario Innovation Hub",
    actionMeta: "Viernes 24 de julio \u00b7 1 cr\u00e9dito",
    review: "Revisar y reservar",
    never: "Carmelita nunca confirma una acci\u00f3n sensible fuera de tus reglas.",
    possibilitiesEyebrow: "UNA CONVERSACI\u00d3N, RESULTADOS REALES",
    possibilitiesTitle: "Menos aplicaciones. M\u00e1s cosas resueltas.",
    possibilities: [
      ["RESERVAR", "Reserva espacios y servicios", "Encuentra disponibilidad, compara opciones y confirma con tu cuenta conectada."],
      ["VIAJAR", "Planifica tu pr\u00f3ximo movimiento", "Busca estad\u00edas, actividades y transporte manteniendo tus preferencias en contexto."],
      ["DINERO", "Prepara acciones con tu wallet", "Revisa pagos y acciones onchain con l\u00edmites, aprobaci\u00f3n y evidencia."],
      ["TRABAJO", "Contrata y organiza", "Convierte una idea en un brief, tarea o proyecto y sigue su entrega."],
    ],
    nameEyebrow: "POR QU\u00c9 CARMELITA",
    nameTitle: "El nombre tambi\u00e9n define c\u00f3mo funciona.",
    nameText: "Nueve letras resumen lo que cada acci\u00f3n \u00fatil debe proteger.",
    nameLetters: [["C", "Contexto"], ["A", "Acciones"], ["R", "Reglas"], ["M", "Memoria"], ["E", "Ejecuci\u00f3n"], ["L", "L\u00edmites"], ["I", "Identidad"], ["T", "Transacciones"], ["A", "Auditor\u00eda"]],
    memoryEyebrow: "PERSONAL, NO GEN\u00c9RICO",
    integrationsEyebrow: "CONECTADO Y VERIFICADO",
    integrationsTitle: "Servicios \u00fatiles a los que Carmelita ya puede llegar.",
    integrationsText: "Cada estado describe lo que realmente probamos. Descubrir, firmar y ejecutar siguen siendo capacidades separadas.",
    integrations: [
      ["ACTIVO", "UNBLCK", "Reservar y cancelar d\u00edas de trabajo", "Verificado mediante la API de reservas del partner"],
      ["TESTNET", "DeFindex", "Depositar XLM en un vault p\u00fablico", "Transacci\u00f3n firmada con Privy y confirmada en Stellar"],
      ["TESTNET", "Stellar x402", "Pagar 0,01 USDC sin cobros duplicados", "Liquidaci\u00f3n y recibo resistente a reintentos verificados"],
      ["SOLO LECTURA", "Travala", "Buscar inventario real de hoteles", "Resultados en vivo mediante Travel MCP"],
      ["SOLO LECTURA", "CoinGecko + CMC", "Cotizar mercados y mantener una watchlist", "Precios reales con fallback autom\u00e1tico"],
    ],
    connectionsCta: "Explorar el laboratorio de integraciones",
    integrationForm: {
      eyebrow: "AYUDA A PRIORIZAR",
      title: "Recomienda una integraci\u00f3n",
      text: "Cu\u00e9ntanos qu\u00e9 servicio deber\u00eda conectar Carmelita y qu\u00e9 quieres lograr con \u00e9l.",
      nameLabel: "Aplicaci\u00f3n o servicio",
      namePlaceholder: "Google Calendar, Slack, Rappi...",
      emailLabel: "Tu email",
      emailPlaceholder: "tu@empresa.com",
      useCaseLabel: "\u00bfQu\u00e9 deber\u00eda hacer Carmelita?",
      useCasePlaceholder: "Por ejemplo: encontrar un horario libre y agendar una reuni\u00f3n.",
      consent: "Carmelita puede contactarme sobre esta solicitud de integraci\u00f3n.",
      submit: "Recomendar integraci\u00f3n",
      sending: "Guardando recomendaci\u00f3n...",
      success: "Recomendaci\u00f3n guardada. La usaremos para priorizar el roadmap.",
      duplicate: "Ya tenemos esta recomendaci\u00f3n tuya. Gracias.",
      error: "No pudimos guardarla ahora. Int\u00e9ntalo nuevamente.",
    },
    memoryTitle: "Aprende c\u00f3mo prefieres hacer las cosas.",
    memoryText: "Carmelita usa solamente las memorias, preferencias y reglas que decides guardar. Cada acci\u00f3n comienza con tu contexto y termina dentro de tus l\u00edmites.",
    memories: ["Espacios tranquilos", "Asiento en ventana", "M\u00e1x. 50 USDC", "Preguntar antes de pagar"],
    controlTitle: "T\u00fa mantienes el control",
    controls: ["Revisi\u00f3n antes de acciones sensibles", "L\u00edmites por acci\u00f3n y por d\u00eda", "Revoca conexiones cuando quieras"],
    howEyebrow: "C\u00d3MO FUNCIONA",
    howTitle: "Desde un mensaje hasta un resultado verificable.",
    steps: [
      ["01", "Pide de forma natural", "Escribe en espa\u00f1ol, ingl\u00e9s o portugu\u00e9s."],
      ["02", "Revisa el plan", "Mira el proveedor, costo, cuenta y consecuencia exacta."],
      ["03", "Aprueba y verifica", "Carmelita ejecuta una vez y devuelve el recibo."],
    ],
    forBusiness: "PARA EMPRESAS",
    businessTitle: "Permite que agentes personales usen tu servicio.",
    businessText: "Publica una acci\u00f3n como buscar, cotizar, reservar u ordenar mediante API, MCP o un conector guiado.",
    businessCta: "Prepara tu negocio para agentes",
    forDevelopers: "PARA DEVELOPERS",
    developerTitle: "Conecta una herramienta. Mant\u00e9n limitada la autoridad.",
    developerText: "Usa intents estructurados, pol\u00edticas, aprobaciones y evidencia sin reconstruir la capa de ejecuci\u00f3n.",
    developerCta: "Explorar plataforma para developers",
    proofEyebrow: "EVIDENCIA FUNCIONAL",
    proofTitle: "Integraciones reales, l\u00edmites honestos.",
    proofs: [
      ["Stellar", "Transacciones Testnet"],
      ["UNBLCK", "API de reservas partner"],
      ["DeFindex", "Flujo de acci\u00f3n vault"],
      ["Travala", "B\u00fasqueda real de viajes"],
    ],
    finalTitle: "\u00bfQu\u00e9 deber\u00eda resolver Carmelita primero?",
    finalText: "Crea tu agente, conecta lo que usas y comienza en Testnet sin fondos reales.",
    finalCta: "Abrir Carmelita",
    waitlist: "Unirme a la waitlist",
    footer: "Construido en Latinoam\u00e9rica para una econom\u00eda global de agentes.",
  },
  pt: {
    integrationsEyebrow: "CONECTADO E VERIFICADO",
    integrationsTitle: "Servi\u00e7os \u00fateis que Carmelita j\u00e1 pode acessar.",
    integrationsText: "Cada status descreve o que realmente testamos. Descoberta, assinatura e execu\u00e7\u00e3o continuam sendo capacidades separadas.",
    integrations: [
      ["ATIVO", "UNBLCK", "Reservar e cancelar dias de trabalho", "Verificado pela API de reservas do parceiro"],
      ["TESTNET", "DeFindex", "Depositar XLM em um vault p\u00fablico", "Transa\u00e7\u00e3o assinada com Privy e confirmada na Stellar"],
      ["TESTNET", "Stellar x402", "Pagar 0,01 USDC sem cobran\u00e7as duplicadas", "Liquida\u00e7\u00e3o e recibo resistente a repeti\u00e7\u00f5es verificados"],
      ["SOMENTE LEITURA", "Travala", "Pesquisar invent\u00e1rio real de hot\u00e9is", "Resultados ao vivo pelo Travel MCP"],
      ["SOMENTE LEITURA", "CoinGecko + CMC", "Consultar mercados e manter uma watchlist", "Pre\u00e7os reais com fallback autom\u00e1tico"],
    ],
    connectionsCta: "Explorar o laborat\u00f3rio de integra\u00e7\u00f5es",
    integrationForm: {
      eyebrow: "AJUDE A PRIORIZAR",
      title: "Recomende uma integra\u00e7\u00e3o",
      text: "Conte qual servi\u00e7o Carmelita deve conectar e o que voc\u00ea quer realizar com ele.",
      nameLabel: "Aplicativo ou servi\u00e7o",
      namePlaceholder: "Google Calendar, Slack, Rappi...",
      emailLabel: "Seu email",
      emailPlaceholder: "voce@empresa.com",
      useCaseLabel: "O que Carmelita deve fazer?",
      useCasePlaceholder: "Por exemplo: encontrar um hor\u00e1rio livre e agendar uma reuni\u00e3o.",
      consent: "Carmelita pode entrar em contato sobre esta solicita\u00e7\u00e3o.",
      submit: "Recomendar integra\u00e7\u00e3o",
      sending: "Salvando recomenda\u00e7\u00e3o...",
      success: "Recomenda\u00e7\u00e3o salva. Vamos us\u00e1-la para priorizar o roadmap.",
      duplicate: "J\u00e1 temos esta recomenda\u00e7\u00e3o sua. Obrigado.",
      error: "N\u00e3o foi poss\u00edvel salvar agora. Tente novamente.",
    },
    nav: ["O que pode fazer", "Integra\u00e7\u00f5es", "Como funciona", "Para empresas", "Developers"],
    enter: "Entrar",
    eyebrow: "SEU AGENTE PESSOAL DE EXECU\u00c7\u00c3O",
    title: <>{"Pe\u00e7a \u00e0 Carmelita."}<br /><em>{"Ela prepara. Voc\u00ea decide."}</em></>,
    lede: "Diga \u00e0 Carmelita o que voc\u00ea precisa. Ela lembra suas prefer\u00eancias, encontra o servi\u00e7o certo e prepara a a\u00e7\u00e3o. Voc\u00ea aprova o que importa.",
    primary: "Come\u00e7ar com Carmelita",
    secondary: "Ver o que pode fazer",
    trust: ["Sua wallet", "Suas regras", "Recibos claros"],
    userMessage: "Reserve um espa\u00e7o de trabalho para sexta-feira.",
    thinking: "Encontrei disponibilidade na UNBLCK.",
    actionReady: "Pronta para sua revis\u00e3o",
    actionTitle: "Passe di\u00e1rio Innovation Hub",
    actionMeta: "Sexta, 24 de julho \u00b7 1 cr\u00e9dito",
    review: "Revisar e reservar",
    never: "Carmelita nunca confirma uma a\u00e7\u00e3o sens\u00edvel fora das suas regras.",
    possibilitiesEyebrow: "UMA CONVERSA, RESULTADOS REAIS",
    possibilitiesTitle: "Menos aplicativos. Mais coisas resolvidas.",
    possibilities: [
      ["RESERVAR", "Reserve espa\u00e7os e servi\u00e7os", "Encontre disponibilidade, compare op\u00e7\u00f5es e confirme com sua conta conectada."],
      ["VIAJAR", "Planeje seu pr\u00f3ximo movimento", "Pesquise estadias, atividades e transporte mantendo suas prefer\u00eancias em contexto."],
      ["DINHEIRO", "Prepare a\u00e7\u00f5es com sua wallet", "Revise pagamentos e a\u00e7\u00f5es onchain com limites, aprova\u00e7\u00e3o e evid\u00eancia."],
      ["TRABALHO", "Contrate e organize", "Transforme uma ideia em briefing, tarefa ou projeto e acompanhe a entrega."],
    ],
    nameEyebrow: "POR QUE CARMELITA",
    nameTitle: "O nome tamb\u00e9m define como funciona.",
    nameText: "Nove letras resumem o que cada a\u00e7\u00e3o \u00fatil deve preservar.",
    nameLetters: [["C", "Contexto"], ["A", "A\u00e7\u00f5es"], ["R", "Regras"], ["M", "Mem\u00f3ria"], ["E", "Execu\u00e7\u00e3o"], ["L", "Limites"], ["I", "Identidade"], ["T", "Transa\u00e7\u00f5es"], ["A", "Auditoria"]],
    memoryEyebrow: "PESSOAL, N\u00c3O GEN\u00c9RICO",
    memoryTitle: "Aprende como voc\u00ea prefere fazer as coisas.",
    memoryText: "Carmelita usa apenas as mem\u00f3rias, prefer\u00eancias e regras que voc\u00ea decide salvar. Cada a\u00e7\u00e3o come\u00e7a com seu contexto e termina dentro dos seus limites.",
    memories: ["Espa\u00e7os tranquilos", "Assento na janela", "M\u00e1x. 50 USDC", "Perguntar antes de pagar"],
    controlTitle: "Voc\u00ea mant\u00e9m o controle",
    controls: ["Revis\u00e3o antes de a\u00e7\u00f5es sens\u00edveis", "Limites por a\u00e7\u00e3o e por dia", "Revogue conex\u00f5es quando quiser"],
    howEyebrow: "COMO FUNCIONA",
    howTitle: "Da mensagem ao resultado verific\u00e1vel.",
    steps: [
      ["01", "Pe\u00e7a naturalmente", "Escreva em portugu\u00eas, espanhol ou ingl\u00eas."],
      ["02", "Revise o plano", "Veja o provider, custo, conta e consequ\u00eancia exata."],
      ["03", "Aprove e verifique", "Carmelita executa uma vez e devolve o recibo."],
    ],
    forBusiness: "PARA EMPRESAS",
    businessTitle: "Permita que agentes pessoais usem seu servi\u00e7o.",
    businessText: "Publique uma a\u00e7\u00e3o como buscar, cotar, reservar ou pedir via API, MCP ou conector guiado.",
    businessCta: "Prepare seu neg\u00f3cio para agentes",
    forDevelopers: "PARA DEVELOPERS",
    developerTitle: "Conecte uma ferramenta. Mantenha a autoridade limitada.",
    developerText: "Use intents estruturados, pol\u00edticas, aprova\u00e7\u00f5es e evid\u00eancias sem reconstruir a camada de execu\u00e7\u00e3o.",
    developerCta: "Explorar plataforma para developers",
    proofEyebrow: "EVID\u00caNCIA FUNCIONAL",
    proofTitle: "Integra\u00e7\u00f5es reais, limites honestos.",
    proofs: [
      ["Stellar", "Transa\u00e7\u00f5es Testnet"],
      ["UNBLCK", "API de reservas partner"],
      ["DeFindex", "Fluxo de a\u00e7\u00e3o vault"],
      ["Travala", "Pesquisa real de viagens"],
    ],
    finalTitle: "O que Carmelita deveria resolver primeiro?",
    finalText: "Crie seu agente, conecte o que usa e comece na Testnet sem fundos reais.",
    finalCta: "Abrir Carmelita",
    waitlist: "Entrar na waitlist",
    footer: "Constru\u00eddo na Am\u00e9rica Latina para uma economia global de agentes.",
  },
};

export default function HomeExperience() {
  const { locale, setLocale } = useLocale();
  const t = copy[locale];

  return (
    <main className="home-next" id="top">
      <nav className="home-nav shell">
        <Link href="/" aria-label="Carmelita home"><BrandLockup /></Link>
        <div className="home-nav-links">
          <a href="#possibilities">{t.nav[0]}</a>
          <a href="#integrations">{t.nav[1]}</a>
          <a href="#how">{t.nav[2]}</a>
          <a href="#build">{t.nav[3]}</a>
          <Link href="/developers">{t.nav[4]}</Link>
        </div>
        <div className="home-nav-actions">
          <LanguageToggle locale={locale} onChange={setLocale} compact />
          <Link className="home-enter" href="/agent?connect=privy">{t.enter}</Link>
        </div>
      </nav>

      <section className="home-hero shell">
        <div className="home-hero-copy">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p className="home-lede">{t.lede}</p>
          <div className="home-actions">
            <Link href="/agent?connect=privy">{t.primary}</Link>
            <a href="#possibilities">{t.secondary}</a>
          </div>
          <div className="home-trust">{t.trust.map((item) => <span key={item}>{item}</span>)}</div>
        </div>

        <div className="home-chat" aria-label="Example Carmelita conversation">
          <div className="home-chat-top"><span className="home-online" /> Carmelita <small>TESTNET</small></div>
          <div className="home-message user"><b>YOU</b><p>{t.userMessage}</p></div>
          <div className="home-message agent"><b>C</b><p>{t.thinking}</p></div>
          <div className="home-action-preview">
            <span>{t.actionReady}</span>
            <strong>{t.actionTitle}</strong>
            <small>{t.actionMeta}</small>
            <Link href="/agent?connect=privy">{t.review}</Link>
          </div>
          <p className="home-guardrail">{t.never}</p>
        </div>
      </section>

      <section className="home-proofline">
        <div className="shell">{t.proofs.map((proof) => <span key={proof[0]}><b>{proof[0]}</b>{proof[1]}</span>)}</div>
      </section>

      <section className="home-section shell" id="possibilities">
        <div className="home-heading">
          <p className="eyebrow">{t.possibilitiesEyebrow}</p>
          <h2>{t.possibilitiesTitle}</h2>
        </div>
        <div className="home-possibilities">
          {t.possibilities.map((item, index) => (
            <article key={item[0]}>
              <span>{String(index + 1).padStart(2, "0")} / {item[0]}</span>
              <h3>{item[1]}</h3>
              <p>{item[2]}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-integrations" id="integrations">
        <div className="shell">
          <div className="home-integrations-heading">
            <div>
              <p className="eyebrow">{t.integrationsEyebrow}</p>
              <h2>{t.integrationsTitle}</h2>
            </div>
            <div>
              <p>{t.integrationsText}</p>
              <Link href="/connections">{t.connectionsCta} <b>{"\u2192"}</b></Link>
            </div>
          </div>

          <div className="home-integrations-grid">
            <div className="home-integration-list">
              {t.integrations.map((integration) => (
                <article key={integration[1]}>
                  <span>{integration[0]}</span>
                  <div>
                    <h3>{integration[1]}</h3>
                    <p>{integration[2]}</p>
                  </div>
                  <small>{integration[3]}</small>
                </article>
              ))}
            </div>
            <IntegrationRecommendationForm locale={locale} copy={t.integrationForm} />
          </div>
        </div>
      </section>
      <section className="home-name shell" aria-labelledby="carmelita-name-title">

        <div className="home-name-heading">
          <p className="eyebrow">{t.nameEyebrow}</p>
          <h2 id="carmelita-name-title">{t.nameTitle}</h2>
          <p>{t.nameText}</p>
        </div>
        <div className="home-name-grid">
          {t.nameLetters.map((item, index) => (
            <div key={`${item[0]}-${item[1]}-${index}`}>
              <b>{item[0]}</b>
              <span>{item[1]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="home-memory">
        <div className="shell home-memory-grid">
          <div>
            <p className="eyebrow">{t.memoryEyebrow}</p>
            <h2>{t.memoryTitle}</h2>
            <p>{t.memoryText}</p>
            <div className="home-memory-chips">{t.memories.map((memory) => <span key={memory}>{memory}</span>)}</div>
          </div>
          <aside>
            <span>CONTROL</span>
            <h3>{t.controlTitle}</h3>
            <ul>{t.controls.map((control) => <li key={control}>{control}</li>)}</ul>
          </aside>
        </div>
      </section>

      <section className="home-section shell" id="how">
        <div className="home-heading compact">
          <p className="eyebrow">{t.howEyebrow}</p>
          <h2>{t.howTitle}</h2>
        </div>
        <div className="home-steps">
          {t.steps.map((step) => <article key={step[0]}><b>{step[0]}</b><h3>{step[1]}</h3><p>{step[2]}</p></article>)}
        </div>
      </section>

      <section className="home-section shell" id="build">
        <div className="home-audiences">
          <article className="business">
            <span>{t.forBusiness}</span>
            <h2>{t.businessTitle}</h2>
            <p>{t.businessText}</p>
            <Link href="/connections">{t.businessCta} <b>{"\u2192"}</b></Link>
          </article>
          <article className="developers">
            <span>{t.forDevelopers}</span>
            <h2>{t.developerTitle}</h2>
            <p>{t.developerText}</p>
            <Link href="/developers">{t.developerCta} <b>{"\u2192"}</b></Link>
          </article>
        </div>
      </section>

      <section className="home-final shell">
        <div>
          <p className="eyebrow">{t.proofEyebrow}</p>
          <h2>{t.finalTitle}</h2>
          <p>{t.finalText}</p>
        </div>
        <div>
          <Link href="/agent?connect=privy">{t.finalCta}</Link>
          <Link href="/waitlist">{t.waitlist}</Link>
        </div>
      </section>

      <footer className="home-footer shell">
        <BrandLockup />
        <p>{t.footer}</p>
        <Link href="/developers">Docs</Link>
      </footer>
    </main>
  );
}

