import type { AgentChatReply } from "@/app/agent-chat-logic";
import type { CctpBridgeIntent } from "@/app/connectors/circle-cctp-intents";
import {
  buildCctpFujiToStellarPlan,
  getCctpFujiToStellarFees,
} from "@/app/connectors/circle-cctp";
import { getCctpFujiToStellarContext } from "@/app/connectors/circle-cctp-context";

type Language = "en" | "es" | "pt";

const docs = "https://developers.circle.com/cctp/quickstarts/transfer-usdc-stellar-arc";
const readinessPrompts = {
  en: "Check whether I can use the CCTP bridge",
  es: "Revisa si puedo usar el bridge CCTP",
  pt: "Verifique se posso usar a ponte CCTP",
};

const blockerNames: Record<string, Record<Language, string>> = {
  fuji_avax_required: {
    en: "Fund the Fuji wallet with AVAX for gas",
    es: "Recargar la wallet Fuji con AVAX para gas",
    pt: "Recarregar a wallet Fuji com AVAX para gas",
  },
  fuji_usdc_required: {
    en: "Fund the Fuji wallet with enough official Testnet USDC",
    es: "Recargar la wallet Fuji con suficiente USDC Testnet oficial",
    pt: "Recarregar a wallet Fuji com USDC Testnet oficial suficiente",
  },
  stellar_xlm_required: {
    en: "Fund the Stellar Testnet wallet with XLM for Soroban fees",
    es: "Recargar la wallet Stellar Testnet con XLM para las comisiones Soroban",
    pt: "Recarregar a wallet Stellar Testnet com XLM para as taxas Soroban",
  },
  stellar_circle_usdc_trustline_required: {
    en: "Activate the official Circle Testnet USDC trustline on Stellar",
    es: "Activar la trustline del USDC Testnet oficial de Circle en Stellar",
    pt: "Ativar a trustline do USDC Testnet oficial da Circle na Stellar",
  },
};

export async function handleCctpBridgeIntent(input: {
  userId: string;
  intent: CctpBridgeIntent;
  language: Language;
}): Promise<AgentChatReply> {
  const { userId, intent, language } = input;
  if (intent.operation === "unsupported_route") {
    return {
      content: {
        en: "That CCTP route is part of the multichain roadmap, but the only route enabled for safe planning today is **Avalanche Fuji → Stellar Testnet**. I did not prepare or sign a transaction.",
        es: "Esa ruta CCTP forma parte del roadmap multichain, pero hoy la única ruta habilitada para planificación segura es **Avalanche Fuji → Stellar Testnet**. No preparé ni firmé ninguna transacción.",
        pt: "Essa rota CCTP faz parte do roadmap multichain, mas hoje a única rota habilitada para planejamento seguro é **Avalanche Fuji → Stellar Testnet**. Não preparei nem assinei nenhuma transação.",
      }[language],
      connection: { name: "Circle CCTP V2", stage: "Research", priority: "P0" },
      actions: [{
        label: language === "es" ? "Revisar ruta disponible" : language === "pt" ? "Ver rota disponível" : "Check available route",
        message: readinessPrompts[language],
      }],
    };
  }

  const readiness = await getCctpFujiToStellarContext(userId);
  if (
    intent.operation === "readiness" ||
    !readiness.sourceAddress ||
    !readiness.destinationAddress
  ) {
    const pending = [
      !readiness.sourceAddress ? "Avalanche Fuji Privy wallet" : null,
      !readiness.destinationAddress ? "Stellar Testnet Privy wallet" : null,
      readiness.sourceAddress && readiness.sourceGasReady !== true
        ? blockerNames.fuji_avax_required[language]
        : null,
      readiness.sourceAddress && Number(readiness.sourceUsdcBalance ?? 0) <= 0
        ? blockerNames.fuji_usdc_required[language]
        : null,
      readiness.destinationAddress && readiness.destinationGasReady !== true
        ? blockerNames.stellar_xlm_required[language]
        : null,
      readiness.destinationAddress && readiness.destinationTrustlineReady !== true
        ? blockerNames.stellar_circle_usdc_trustline_required[language]
        : null,
    ].filter((value): value is string => Boolean(value));
    const needsFujiGas = Boolean(
      readiness.sourceAddress &&
      readiness.sourceGasReady !== true,
    );
    const copy = {
      en: {
        title: "**Circle CCTP V2 bridge readiness · Fuji → Stellar Testnet**",
        source: "Source Privy wallet",
        destination: "Destination Privy wallet",
        pending: "Pending",
        ready: "✅ The wallets and balances are ready to build a transaction-specific plan.",
        boundary: "This check is read-only. No approval, signature, burn or mint was requested.",
        plan: "Plan 1 USDC bridge",
        message: "Bridge 1 USDC from Avalanche Fuji to Stellar Testnet",
      },
      es: {
        title: "**Preparación del bridge Circle CCTP V2 · Fuji → Stellar Testnet**",
        source: "Wallet Privy de origen",
        destination: "Wallet Privy de destino",
        pending: "Pendiente",
        ready: "✅ Las wallets y los saldos están listos para crear un plan específico.",
        boundary: "Esta revisión es de solo lectura. No se solicitó aprobación, firma, burn ni mint.",
        plan: "Planificar bridge de 1 USDC",
        message: "Puentea 1 USDC desde Avalanche Fuji a Stellar Testnet",
      },
      pt: {
        title: "**Preparação da ponte Circle CCTP V2 · Fuji → Stellar Testnet**",
        source: "Wallet Privy de origem",
        destination: "Wallet Privy de destino",
        pending: "Pendente",
        ready: "✅ As wallets e os saldos estão prontos para criar um plano específico.",
        boundary: "Esta verificação é somente leitura. Nenhuma aprovação, assinatura, burn ou mint foi solicitada.",
        plan: "Planejar ponte de 1 USDC",
        message: "Transfira 1 USDC pela ponte de Avalanche Fuji para Stellar Testnet",
      },
    }[language];
    return {
      content: [
        copy.title,
        `- ${copy.source}: ${readiness.sourceAddress ?? copy.pending}`,
        `- ${copy.destination}: ${readiness.destinationAddress ?? copy.pending}`,
        pending.length
          ? `${copy.pending}:\n${pending.map((item) => `- ${item}`).join("\n")}`
          : copy.ready,
        copy.boundary,
      ].join("\n\n"),
      connection: { name: "Circle CCTP V2", stage: "Read-only connected", priority: "P0" },
      actions: [
        ...(needsFujiGas ? [{
          label: language === "es"
            ? "Resolver gas Fuji en Carmelita"
            : language === "pt"
              ? "Resolver gas Fuji na Carmelita"
              : "Resolve Fuji gas in Carmelita",
          walletAction: {
            type: "avalanche.fund" as const,
            network: "avalanche:fuji" as const,
          },
        }] : []),
        { label: copy.plan, message: copy.message },
        { label: "Circle CCTP docs", href: docs },
      ],
    };
  }

  const [plan, fees] = await Promise.all([
    Promise.resolve(buildCctpFujiToStellarPlan({
      amount: intent.amount,
      sourceAddress: readiness.sourceAddress,
      destinationAddress: readiness.destinationAddress,
      readiness,
    })),
    getCctpFujiToStellarFees().catch(() => null),
  ]);
  const pending = plan.blockers.map(
    (blocker) => blockerNames[blocker]?.[language] ?? blocker,
  );
  const canStart = plan.blockers.every(
    (blocker) => blocker === "stellar_circle_usdc_trustline_required",
  );
  const needsFujiGas = plan.blockers.includes("fuji_avax_required");
  const standardFee = fees?.options.find(
    (option) => option.finalityThreshold >= 2000,
  )?.minimumFeeUsdc;
  const copy = {
    en: {
      title: `**CCTP V2 Testnet plan · ${plan.amount} USDC**`,
      fee: "Current Circle standard transfer minimum fee",
      stages: "Controlled stages",
      pending: "Blockers before execution",
      ready: "The plan is ready for the future transaction builder.",
      boundary: "No transaction was prepared and no funds moved. Execution starts only after you review the plan and Privy separately confirms each source and destination action.",
      review: "Check readiness",
    },
    es: {
      title: `**Plan CCTP V2 Testnet · ${plan.amount} USDC**`,
      fee: "Comisión mínima actual de transferencia estándar de Circle",
      stages: "Etapas controladas",
      pending: "Bloqueos antes de ejecutar",
      ready: "El plan está listo para el futuro constructor de transacciones.",
      boundary: "No se preparó ninguna transacción ni se movieron fondos. La ejecución comienza solo después de revisar el plan y confirmar por separado en Privy cada acción de origen y destino.",
      review: "Revisar preparación",
    },
    pt: {
      title: `**Plano CCTP V2 Testnet · ${plan.amount} USDC**`,
      fee: "Taxa mínima atual da transferência padrão da Circle",
      stages: "Etapas controladas",
      pending: "Bloqueios antes da execução",
      ready: "O plano está pronto para o futuro construtor de transações.",
      boundary: "Nenhuma transação foi preparada e nenhum saldo foi movimentado. A execução começa somente após revisar o plano e confirmar separadamente na Privy cada ação de origem e destino.",
      review: "Verificar preparação",
    },
  }[language];
  return {
    content: [
      copy.title,
      `Avalanche Fuji (${plan.source.address}) → Stellar Testnet (${plan.destination.address})`,
      `${copy.fee}: **${standardFee ?? "unavailable"} USDC**`,
      `${copy.stages}:\n${plan.stages.map((stage, index) => `${index + 1}. ${stage}`).join("\n")}`,
      pending.length
        ? `${copy.pending}:\n${pending.map((item) => `- ${item}`).join("\n")}`
        : copy.ready,
      copy.boundary,
    ].join("\n\n"),
    connection: {
      name: "Circle CCTP V2",
      stage: plan.readyToPrepare ? "Ready to test" : "Credentials needed",
      priority: "P0",
    },
    actions: [
      ...(needsFujiGas ? [{
        label: language === "es"
          ? "Resolver gas Fuji en Carmelita"
          : language === "pt"
            ? "Resolver gas Fuji na Carmelita"
            : "Resolve Fuji gas in Carmelita",
        walletAction: {
          type: "avalanche.fund" as const,
          network: "avalanche:fuji" as const,
        },
      }] : []),
      ...(canStart ? [{
        label: language === "es"
          ? "Iniciar bridge con confirmaciones"
          : language === "pt"
            ? "Iniciar ponte com confirmações"
            : "Start bridge with confirmations",
        walletAction: {
          type: "cctp.bridge" as const,
          network: "avalanche:fuji" as const,
          destinationNetwork: "stellar:testnet" as const,
          amount: plan.amount,
        },
      }] : []),
      { label: copy.review, message: readinessPrompts[language] },
      { label: "Circle CCTP docs", href: plan.docs },
    ],
  };
}
