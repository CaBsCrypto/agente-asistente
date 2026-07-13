import { createHash, randomUUID } from "node:crypto";
import { Keypair, StrKey } from "@stellar/stellar-sdk";

const PRIVY_API_URL = "https://api.privy.io/v1";
export const STELLAR_TESTNET_HORIZON =
  "https://horizon-testnet.stellar.org";
export const STELLAR_TESTNET_FRIENDBOT = "https://friendbot.stellar.org";

type PrivyWalletResponse = {
  id?: string;
  address?: string;
  chain_type?: string;
};

type PrivyRawSignResponse = {
  data?: {
    signature?: string;
    encoding?: string;
  };
  signature?: string;
};

type HorizonBalance = {
  asset_type: string;
  asset_code?: string;
  balance: string;
};

function requiredPrivyCredentials() {
  const appId = process.env.PRIVY_APP_ID?.trim();
  const appSecret = process.env.PRIVY_APP_SECRET?.trim();

  if (!appId || !appSecret) {
    throw new Error("privy_not_configured");
  }

  return { appId, appSecret };
}

async function privyRequest<T>(path: string, init: RequestInit) {
  const { appId, appSecret } = requiredPrivyCredentials();
  const response = await fetch(PRIVY_API_URL + path, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization:
        "Basic " + Buffer.from(appId + ":" + appSecret).toString("base64"),
      "Content-Type": "application/json",
      "privy-app-id": appId,
      ...init.headers,
    },
    cache: "no-store",
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      body && typeof body === "object" && "message" in body
        ? String(body.message)
        : "Privy request failed with status " + response.status;
    throw new Error("privy_request_failed:" + detail);
  }

  return body as T;
}

export function getPrivyStellarReadiness() {
  return {
    configured: Boolean(
      process.env.PRIVY_APP_ID?.trim() && process.env.PRIVY_APP_SECRET?.trim(),
    ),
    network: "Stellar Testnet",
    chainType: "stellar",
    horizonUrl: STELLAR_TESTNET_HORIZON,
    friendbotUrl: STELLAR_TESTNET_FRIENDBOT,
    mode: "application-controlled founder test wallet",
  };
}

export function isValidStellarAddress(address: string) {
  return StrKey.isValidEd25519PublicKey(address);
}

export function verifyStellarSignature(
  address: string,
  payload: Uint8Array,
  signature: Uint8Array,
) {
  if (!isValidStellarAddress(address)) return false;
  return Keypair.fromPublicKey(address).verify(
    Buffer.from(payload),
    Buffer.from(signature),
  );
}

export async function createPrivyStellarWallet(label?: string) {
  const wallet = await privyRequest<PrivyWalletResponse>("/wallets", {
    method: "POST",
    body: JSON.stringify({
      chain_type: "stellar",
      display_name: label?.trim().slice(0, 80) || "Agent Assistant Testnet",
      external_id: "aa-stellar-testnet-" + randomUUID(),
    }),
  });

  if (
    !wallet.id ||
    !wallet.address ||
    !isValidStellarAddress(wallet.address)
  ) {
    throw new Error("privy_invalid_stellar_wallet_response");
  }

  return {
    id: wallet.id,
    address: wallet.address,
    chainType: wallet.chain_type ?? "stellar",
  };
}

export async function fundStellarTestnetWallet(address: string) {
  if (!isValidStellarAddress(address)) {
    throw new Error("invalid_stellar_address");
  }

  const response = await fetch(
    STELLAR_TESTNET_FRIENDBOT + "?addr=" + encodeURIComponent(address),
    { method: "GET", cache: "no-store" },
  );
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      body && typeof body === "object" && "detail" in body
        ? String(body.detail)
        : "Friendbot failed with status " + response.status;
    throw new Error("friendbot_failed:" + detail);
  }

  return {
    funded: true,
    transactionHash:
      body && typeof body === "object" && "hash" in body
        ? String(body.hash)
        : null,
  };
}

export async function getStellarTestnetAccount(address: string) {
  if (!isValidStellarAddress(address)) {
    throw new Error("invalid_stellar_address");
  }

  const response = await fetch(
    STELLAR_TESTNET_HORIZON + "/accounts/" + encodeURIComponent(address),
    { cache: "no-store" },
  );

  if (response.status === 404) {
    return { exists: false, sequence: null, balances: [] };
  }

  const body = await response.json().catch(() => null);
  if (!response.ok || !body || typeof body !== "object") {
    throw new Error("horizon_account_lookup_failed");
  }

  const account = body as {
    sequence?: string;
    balances?: HorizonBalance[];
  };

  return {
    exists: true,
    sequence: account.sequence ?? null,
    balances: (account.balances ?? []).map((balance) => ({
      asset:
        balance.asset_type === "native"
          ? "XLM"
          : balance.asset_code ?? balance.asset_type,
      balance: balance.balance,
    })),
  };
}

export async function signAndVerifyStellarChallenge(
  walletId: string,
  address: string,
) {
  if (!walletId.trim() || !isValidStellarAddress(address)) {
    throw new Error("invalid_wallet_identity");
  }

  const challenge = "agent-assistant:stellar-testnet:" + randomUUID();
  const digest = createHash("sha256").update(challenge).digest();
  const result = await privyRequest<PrivyRawSignResponse>(
    "/wallets/" + encodeURIComponent(walletId) + "/raw_sign",
    {
      method: "POST",
      body: JSON.stringify({ params: { hash: "0x" + digest.toString("hex") } }),
    },
  );
  const encodedSignature = result.data?.signature ?? result.signature;

  if (!encodedSignature) {
    throw new Error("privy_signature_missing");
  }

  const signature = Buffer.from(encodedSignature.replace(/^0x/, ""), "hex");
  const verified = verifyStellarSignature(address, digest, signature);

  return {
    verified,
    challenge,
    digest: "0x" + digest.toString("hex"),
    signature: "0x" + signature.toString("hex"),
    encoding: result.data?.encoding ?? "hex",
  };
}
