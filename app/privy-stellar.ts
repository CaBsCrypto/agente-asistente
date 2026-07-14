import { createHash, randomUUID } from "node:crypto";
import { PrivyClient, type Wallet } from "@privy-io/node";
import { Keypair, StrKey } from "@stellar/stellar-sdk";

export const PRIVY_WALLET_ARCHITECTURE = {
  active: ["stellar"],
  future: ["ethereum", "solana"],
  evmNetworks: ["base", "bnb", "avalanche"],
} as const;
export const STELLAR_TESTNET_HORIZON =
  "https://horizon-testnet.stellar.org";
export const STELLAR_TESTNET_FRIENDBOT = "https://friendbot.stellar.org";

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

export function getPrivyStellarReadiness() {
  return {
    configured: Boolean(
      process.env.PRIVY_APP_ID?.trim() && process.env.PRIVY_APP_SECRET?.trim(),
    ),
    network: "Stellar Testnet",
    chainType: "stellar",
    horizonUrl: STELLAR_TESTNET_HORIZON,
    friendbotUrl: STELLAR_TESTNET_FRIENDBOT,
    mode: "Privy native Stellar wallet plus Stellar SDK",
  };
}

function getPrivyClient() {
  const { appId, appSecret } = requiredPrivyCredentials();
  return new PrivyClient({ appId, appSecret });
}

export async function verifyPrivyAccessToken(accessToken: string) {
  if (!accessToken.trim()) throw new Error("privy_access_token_missing");
  return getPrivyClient().utils().auth().verifyAccessToken(accessToken);
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
  const wallet = await getPrivyClient().wallets().create({
    chain_type: "stellar",
    display_name: label?.trim().slice(0, 80) || "Agent Assistant Testnet",
    external_id: "aa-stellar-testnet-" + randomUUID(),
  });

  if (!isValidStellarAddress(wallet.address)) {
    throw new Error("privy_invalid_stellar_wallet_response");
  }

  return {
    id: wallet.id,
    address: wallet.address,
    chainType: wallet.chain_type,
  };
}
export function getPrivyUserWalletExternalId(userId: string) {
  const digest = createHash("sha256").update(userId).digest("hex");
  return "aa_stellar_" + digest.slice(0, 40);
}

async function listUserStellarWallets(userId: string) {
  const result = await getPrivyClient().wallets().list({
    user_id: userId,
    chain_type: "stellar",
    limit: 100,
  });

  return result.data.filter(
    (wallet: Wallet) =>
      isValidStellarAddress(wallet.address) && wallet.chain_type === "stellar",
  );
}
export async function getOrCreateUserStellarWallet(userId: string) {
  if (!userId.startsWith("did:privy:")) {
    throw new Error("invalid_privy_user_id");
  }

  const externalId = getPrivyUserWalletExternalId(userId);
  const current = await listUserStellarWallets(userId);
  const existing =
    current.find((wallet) => wallet.external_id === externalId) ?? current[0];

  if (existing?.id && existing.address) {
    return {
      id: existing.id,
      address: existing.address,
      chainType: "stellar",
      created: false,
      owner: "user" as const,
    };
  }

  try {
    const wallet = await getPrivyClient().wallets().create({
      chain_type: "stellar",
      display_name: "Agent Assistant Wallet",
      external_id: externalId,
      owner: { user_id: userId },
      idempotency_key: externalId,
    });

    if (!wallet.id || !wallet.address || !isValidStellarAddress(wallet.address)) {
      throw new Error("privy_invalid_stellar_wallet_response");
    }

    return {
      id: wallet.id,
      address: wallet.address,
      chainType: "stellar",
      created: true,
      owner: "user" as const,
    };
  } catch (error) {
    const afterRace = await listUserStellarWallets(userId).catch(() => []);
    const recovered =
      afterRace.find((wallet) => wallet.external_id === externalId) ?? afterRace[0];
    if (recovered?.id && recovered.address) {
      return {
        id: recovered.id,
        address: recovered.address,
        chainType: "stellar",
        created: false,
        owner: "user" as const,
      };
    }
    throw error;
  }
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
  const result = await getPrivyClient().wallets().rawSign(walletId, {
    params: { hash: "0x" + digest.toString("hex") },
  });
  const encodedSignature = result.signature;

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
    encoding: result.encoding,
  };
}
