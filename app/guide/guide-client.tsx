"use client";

import Link from "next/link";
import { useState } from "react";
import LanguageToggle, { useLocale } from "../language-toggle";

const copy = {
  en: {
    nav: "New user guide",
    back: "Product",
    agent: "Open my agent",
    eyebrow: "START HERE",
    title: "Your first safe agent action, from chat.",
    lede:
      "Create your account, understand your wallet and complete the Stellar Testnet path without touching a DeFi console.",
    badges: ["5-minute setup", "No real money", "English · Español · Português"],
    before: "Before you begin",
    beforeTitle: "Testnet is a practice environment.",
    beforeText:
      "Privy creates one user-owned Stellar wallet for each account. Testnet XLM has no real value, Mainnet is disabled and your private key never reaches agent-assistant.",
    beforeItems: [
      "Use a new email if you want to observe the complete wallet activation flow.",
      "An existing wallet will keep its address and current on-chain state.",
      "Chat can prepare sensitive actions, but Privy must approve every trustline or deposit.",
    ],
    journey: "YOUR FIRST JOURNEY",
    journeyTitle: "Six messages. One observable state machine.",
    journeyText:
      "Send these messages one at a time. The agent reads Stellar after every step and recommends only the next valid action.",
    steps: [
      ["01", "Sign in", "Open the agent and continue with Google or email. Privy creates your identity and user-owned Stellar address.", ""],
      ["02", "Ask for your wallet", "The agent returns your address, XLM account status, exact USDC trustline status and compatible USDC balance.", "Show my wallet"],
      ["03", "Request Testnet XLM", "If the account does not exist, Friendbot creates it and supplies fake Testnet XLM. Existing accounts are not funded twice.", "Fund my wallet with Testnet XLM"],
      ["04", "Check XLM", "XLM is Stellar's native asset. It does not need a separate trustline; the agent reports whether the account is active.", "Activate XLM"],
      ["05", "Prepare USDC", "The agent prepares the exact DeFindex-compatible USDC trustline. Review it and confirm with Privy only if every field is correct.", "Activate USDC"],
      ["06", "Prepare the proof", "The agent builds and simulates a 1 XLM DeFindex transaction. Privy confirmation is required before submission.", "Deposit 1 XLM into DeFindex on Testnet"],
    ],
    copy: "Copy",
    copied: "Copied",
    outcomesEyebrow: "WHAT REQUIRES APPROVAL",
    outcomesTitle: "Conversation is not unlimited authority.",
    outcomes: [
      ["Show wallet and balances", "No signature", "Read-only"],
      ["Request Friendbot Testnet XLM", "No wallet signature", "User-requested Testnet funding"],
      ["Create the USDC trustline", "Privy confirmation", "On-chain ChangeTrust"],
      ["Deposit into DeFindex", "Privy confirmation", "On-chain Soroban transaction"],
      ["Spend real funds", "Unavailable", "Mainnet disabled"],
    ],
    safety: "SAFETY CHECKLIST",
    safetyTitle: "Confirm the details, not the conversation.",
    safetyItems: [
      "Network must say Stellar Testnet.",
      "Check the wallet address, asset, amount and destination.",
      "Never share a seed phrase or private key; the product will not ask for one.",
      "Close the review if anything differs from what you requested.",
      "Use the explorer receipt as proof that a Testnet transaction settled.",
    ],
    problemsEyebrow: "COMMON QUESTIONS",
    problemsTitle: "If something looks different, start here.",
    problems: [
      ["Why did the agent not add more XLM?", "Your account already exists. The agent avoids another Friendbot request and reports the current balance."],
      ["Why does Activate XLM not open a transaction?", "XLM is native to Stellar, so there is no XLM trustline transaction."],
      ["Why is my USDC balance still zero?", "The trustline only allows the wallet to receive the exact asset. A compatible distributor is still required."],
      ["Why can I not deposit USDC?", "The public vault requires one exact USDC issuer. agent-assistant will not substitute another token with the same code."],
      ["What if Testnet resets?", "Sign in again, ask for your wallet and request Testnet XLM. The agent recomputes the state from Stellar."],
      ["What if a review expires?", "Ask the agent to prepare the action again. Never approve an old or unexpected transaction."],
    ],
    next: "READY TO TRY",
    nextTitle: "Keep this guide open and talk to your agent.",
    nextText:
      "For the YC proof, use a new account and record the journey from wallet lookup to an explorer-verifiable 1 XLM DeFindex receipt.",
    nextPrimary: "Open my agent",
    nextSecondary: "Developer documentation",
    footer: "Testnet only · Non-custodial · Explicit approval",
  },
  es: {
    nav: "Guía para nuevos usuarios",
    back: "Producto",
    agent: "Abrir mi agente",
    eyebrow: "COMIENZA AQUÍ",
    title: "Tu primera acción segura, completamente desde el chat.",
    lede:
      "Crea tu cuenta, entiende tu wallet y completa el recorrido de Stellar Testnet sin operar una consola DeFi.",
    badges: ["Configuración en 5 minutos", "Sin dinero real", "English · Español · Português"],
    before: "Antes de comenzar",
    beforeTitle: "Testnet es un entorno de práctica.",
    beforeText:
      "Privy crea una wallet Stellar propiedad del usuario para cada cuenta. El XLM de Testnet no tiene valor real, Mainnet está desactivada y tu clave privada nunca llega a agent-assistant.",
    beforeItems: [
      "Usa un email nuevo si quieres observar el flujo completo de activación.",
      "Una wallet existente conserva su dirección y su estado on-chain actual.",
      "El chat puede preparar acciones sensibles, pero Privy debe aprobar cada trustline o depósito.",
    ],
    journey: "TU PRIMER RECORRIDO",
    journeyTitle: "Seis mensajes. Una máquina de estados observable.",
    journeyText:
      "Envía estos mensajes uno por uno. El agente consulta Stellar después de cada paso y recomienda solamente la siguiente acción válida.",
    steps: [
      ["01", "Ingresa", "Abre el agente y continúa con Google o email. Privy crea tu identidad y dirección Stellar propiedad del usuario.", ""],
      ["02", "Pide tu wallet", "El agente muestra tu dirección, estado XLM, trustline USDC exacta y saldo USDC compatible.", "Dame mi wallet"],
      ["03", "Solicita XLM Testnet", "Si la cuenta no existe, Friendbot la crea y entrega XLM ficticio. Las cuentas existentes no se recargan dos veces.", "Recarga mi wallet con XLM de Testnet"],
      ["04", "Revisa XLM", "XLM es el activo nativo de Stellar. No necesita una trustline separada; el agente informa si la cuenta está activa.", "Activa XLM"],
      ["05", "Prepara USDC", "El agente prepara la trustline USDC exacta compatible con DeFindex. Revísala y confirma con Privy solamente si todos los campos son correctos.", "Activa USDC"],
      ["06", "Prepara la prueba", "El agente construye y simula una transacción de 1 XLM en DeFindex. Privy debe confirmarla antes de enviarla.", "Deposita 1 XLM en DeFindex Testnet"],
    ],
    copy: "Copiar",
    copied: "Copiado",
    outcomesEyebrow: "QUÉ REQUIERE APROBACIÓN",
    outcomesTitle: "La conversación no entrega autoridad ilimitada.",
    outcomes: [
      ["Mostrar wallet y saldos", "Sin firma", "Solo lectura"],
      ["Solicitar XLM a Friendbot", "Sin firma de wallet", "Recarga Testnet solicitada por el usuario"],
      ["Crear trustline USDC", "Confirmación Privy", "ChangeTrust on-chain"],
      ["Depositar en DeFindex", "Confirmación Privy", "Transacción Soroban on-chain"],
      ["Gastar fondos reales", "No disponible", "Mainnet desactivada"],
    ],
    safety: "CHECKLIST DE SEGURIDAD",
    safetyTitle: "Confirma los detalles, no la conversación.",
    safetyItems: [
      "La red debe indicar Stellar Testnet.",
      "Revisa dirección, activo, monto y destino.",
      "Nunca compartas seed phrase o clave privada; el producto no las solicitará.",
      "Cierra la revisión si algo difiere de lo que pediste.",
      "Usa el recibo del explorer como evidencia de la transacción Testnet.",
    ],
    problemsEyebrow: "PREGUNTAS COMUNES",
    problemsTitle: "Si algo se ve diferente, comienza aquí.",
    problems: [
      ["¿Por qué el agente no agregó más XLM?", "Tu cuenta ya existe. El agente evita otra solicitud a Friendbot y muestra el saldo actual."],
      ["¿Por qué Activa XLM no abre una transacción?", "XLM es nativo de Stellar, por lo que no existe una transacción de trustline XLM."],
      ["¿Por qué mi saldo USDC sigue en cero?", "La trustline solamente permite recibir el activo exacto. Todavía se necesita un distribuidor compatible."],
      ["¿Por qué no puedo depositar USDC?", "El vault público requiere un issuer USDC exacto. agent-assistant no sustituirá otro token con el mismo código."],
      ["¿Qué ocurre si Testnet se reinicia?", "Ingresa nuevamente, pide tu wallet y solicita XLM Testnet. El agente recalcula el estado desde Stellar."],
      ["¿Qué hago si la revisión expiró?", "Pide al agente preparar la acción nuevamente. Nunca apruebes una transacción antigua o inesperada."],
    ],
    next: "LISTO PARA PROBAR",
    nextTitle: "Mantén esta guía abierta y conversa con tu agente.",
    nextText:
      "Para la prueba de YC, usa una cuenta nueva y graba el recorrido desde la wallet hasta un recibo verificable de 1 XLM en DeFindex.",
    nextPrimary: "Abrir mi agente",
    nextSecondary: "Documentación para developers",
    footer: "Solo Testnet · No custodial · Aprobación explícita",
  },
  pt: {
    nav: "Guia para novos usuários",
    back: "Produto",
    agent: "Abrir meu agente",
    eyebrow: "COMECE AQUI",
    title: "Sua primeira ação segura, totalmente pelo chat.",
    lede:
      "Crie sua conta, entenda sua wallet e conclua o percurso da Stellar Testnet sem operar um console DeFi.",
    badges: ["Configuração em 5 minutos", "Sem dinheiro real", "English · Español · Português"],
    before: "Antes de começar",
    beforeTitle: "A Testnet é um ambiente de prática.",
    beforeText:
      "A Privy cria uma wallet Stellar do usuário para cada conta. O XLM da Testnet não tem valor real, a Mainnet está desativada e sua chave privada nunca chega ao agent-assistant.",
    beforeItems: [
      "Use um novo email para observar o fluxo completo de ativação.",
      "Uma wallet existente mantém seu endereço e estado on-chain atual.",
      "O chat pode preparar ações sensíveis, mas a Privy deve aprovar cada trustline ou depósito.",
    ],
    journey: "SEU PRIMEIRO PERCURSO",
    journeyTitle: "Seis mensagens. Uma máquina de estados observável.",
    journeyText:
      "Envie as mensagens uma por uma. O agente consulta a Stellar após cada etapa e recomenda somente a próxima ação válida.",
    steps: [
      ["01", "Entre", "Abra o agente e continue com Google ou email. A Privy cria sua identidade e endereço Stellar do usuário.", ""],
      ["02", "Peça sua wallet", "O agente mostra seu endereço, status XLM, trustline USDC exata e saldo USDC compatível.", "Mostre minha wallet"],
      ["03", "Solicite XLM da Testnet", "Se a conta não existir, a Friendbot cria e fornece XLM fictício. Contas existentes não são financiadas duas vezes.", "Recarregue minha wallet com XLM da Testnet"],
      ["04", "Verifique XLM", "XLM é o ativo nativo da Stellar. Não precisa de trustline separada; o agente informa se a conta está ativa.", "Ative XLM"],
      ["05", "Prepare USDC", "O agente prepara a trustline USDC exata compatível com a DeFindex. Revise e confirme com a Privy somente se todos os campos estiverem corretos.", "Ative USDC"],
      ["06", "Prepare a prova", "O agente constrói e simula uma transação de 1 XLM na DeFindex. A Privy deve confirmar antes do envio.", "Deposite 1 XLM na DeFindex Testnet"],
    ],
    copy: "Copiar",
    copied: "Copiado",
    outcomesEyebrow: "O QUE EXIGE APROVAÇÃO",
    outcomesTitle: "A conversa não concede autoridade ilimitada.",
    outcomes: [
      ["Mostrar wallet e saldos", "Sem assinatura", "Somente leitura"],
      ["Solicitar XLM à Friendbot", "Sem assinatura da wallet", "Financiamento Testnet solicitado"],
      ["Criar trustline USDC", "Confirmação Privy", "ChangeTrust on-chain"],
      ["Depositar na DeFindex", "Confirmação Privy", "Transação Soroban on-chain"],
      ["Gastar fundos reais", "Indisponível", "Mainnet desativada"],
    ],
    safety: "CHECKLIST DE SEGURANÇA",
    safetyTitle: "Confirme os detalhes, não a conversa.",
    safetyItems: [
      "A rede deve indicar Stellar Testnet.",
      "Verifique endereço, ativo, valor e destino.",
      "Nunca compartilhe seed phrase ou chave privada; o produto não solicitará.",
      "Feche a revisão se algo for diferente do pedido.",
      "Use o recibo do explorer como prova da transação Testnet.",
    ],
    problemsEyebrow: "PERGUNTAS COMUNS",
    problemsTitle: "Se algo parecer diferente, comece aqui.",
    problems: [
      ["Por que o agente não adicionou mais XLM?", "Sua conta já existe. O agente evita outra solicitação à Friendbot e mostra o saldo atual."],
      ["Por que Ative XLM não abre uma transação?", "XLM é nativo da Stellar, portanto não existe transação de trustline XLM."],
      ["Por que meu saldo USDC continua zero?", "A trustline apenas permite receber o ativo exato. Ainda é necessário um distribuidor compatível."],
      ["Por que não posso depositar USDC?", "O vault público exige um issuer USDC exato. agent-assistant não substituirá outro token com o mesmo código."],
      ["O que acontece se a Testnet reiniciar?", "Entre novamente, peça sua wallet e solicite XLM da Testnet. O agente recalcula o estado na Stellar."],
      ["O que fazer se a revisão expirar?", "Peça ao agente para preparar a ação novamente. Nunca aprove uma transação antiga ou inesperada."],
    ],
    next: "PRONTO PARA TESTAR",
    nextTitle: "Mantenha este guia aberto e converse com seu agente.",
    nextText:
      "Para a prova da YC, use uma nova conta e grave o percurso da wallet até um recibo verificável de 1 XLM na DeFindex.",
    nextPrimary: "Abrir meu agente",
    nextSecondary: "Documentação para developers",
    footer: "Somente Testnet · Não custodial · Aprovação explícita",
  },
};

function Command({
  value,
  copyLabel,
  copiedLabel,
}: {
  value: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyCommand() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="guide-command">
      <code>{value}</code>
      <button type="button" onClick={() => void copyCommand()}>
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}

export default function GuideClient() {
  const { locale, setLocale } = useLocale();
  const t = copy[locale];

  return (
    <main className="guide-page">
      <nav className="guide-nav shell">
        <Link className="brand" href="/">
          <b>AA</b>
          agent-assistant
        </Link>
        <div>
          <Link href="/">{t.back}</Link>
          <LanguageToggle locale={locale} onChange={setLocale} compact />
          <Link className="guide-nav-agent" href="/agent">
            {t.agent}
          </Link>
        </div>
      </nav>

      <header className="guide-hero shell">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p className="lede">{t.lede}</p>
          <div className="guide-badges">
            {t.badges.map((badge) => <span key={badge}>{badge}</span>)}
          </div>
        </div>
        <aside>
          <span>{t.before}</span>
          <h2>{t.beforeTitle}</h2>
          <p>{t.beforeText}</p>
          <ul>
            {t.beforeItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </aside>
      </header>

      <section className="guide-journey shell">
        <div className="guide-heading">
          <p className="eyebrow">{t.journey}</p>
          <h2>{t.journeyTitle}</h2>
          <p>{t.journeyText}</p>
        </div>
        <ol>
          {t.steps.map(([number, title, description, command]) => (
            <li key={number}>
              <span>{number}</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
                {command && (
                  <Command
                    value={command}
                    copyLabel={t.copy}
                    copiedLabel={t.copied}
                  />
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="guide-authority">
        <div className="shell">
          <div className="guide-heading">
            <p className="eyebrow">{t.outcomesEyebrow}</p>
            <h2>{t.outcomesTitle}</h2>
          </div>
          <div className="guide-table" role="table">
            {t.outcomes.map(([action, approval, result]) => (
              <div role="row" key={action}>
                <strong role="cell">{action}</strong>
                <span role="cell">{approval}</span>
                <small role="cell">{result}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="guide-safety shell">
        <div>
          <p className="eyebrow">{t.safety}</p>
          <h2>{t.safetyTitle}</h2>
          <ul>
            {t.safetyItems.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        <div>
          <p className="eyebrow">{t.problemsEyebrow}</p>
          <h2>{t.problemsTitle}</h2>
          <div className="guide-faq">
            {t.problems.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="guide-next shell">
        <div>
          <p className="eyebrow">{t.next}</p>
          <h2>{t.nextTitle}</h2>
          <p>{t.nextText}</p>
        </div>
        <div>
          <Link href="/agent">{t.nextPrimary}</Link>
          <Link href="/developers">{t.nextSecondary}</Link>
        </div>
      </section>

      <footer className="guide-footer shell">
        <Link className="brand" href="/"><b>AA</b>agent-assistant</Link>
        <span>{t.footer}</span>
      </footer>
    </main>
  );
}