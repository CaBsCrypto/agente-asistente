import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  getStellarTestnetAccount,
  isValidStellarAddress,
  STELLAR_TESTNET_HORIZON,
} from "@/app/privy-stellar";
import { X402_TESTNET_USDC } from "@/app/x402/assets";

export const INTERNAL_TESTNET_USDC_DRIP = "0.5000000";

export function getInternalTestnetFaucetReadiness() {
  const secret = process.env.STELLAR_TESTNET_USDC_DISTRIBUTOR_SECRET?.trim();
  if (!secret) return { configured: false, address: null, amount: INTERNAL_TESTNET_USDC_DRIP };
  try {
    const address = Keypair.fromSecret(secret).publicKey();
    return { configured: true, address, amount: INTERNAL_TESTNET_USDC_DRIP };
  } catch {
    return { configured: false, address: null, amount: INTERNAL_TESTNET_USDC_DRIP };
  }
}

export async function sendInternalTestnetUsdc(input: {
  destination: string;
  claimKey: string;
}) {
  if (!isValidStellarAddress(input.destination)) throw new Error("invalid_stellar_address");
  const secret = process.env.STELLAR_TESTNET_USDC_DISTRIBUTOR_SECRET?.trim();
  if (!secret) throw new Error("testnet_usdc_faucet_not_configured");
  const distributor = Keypair.fromSecret(secret);
  if (distributor.publicKey() === input.destination) throw new Error("testnet_faucet_self_payment_blocked");

  const destination = await getStellarTestnetAccount(input.destination);
  const trustline = destination.balances.find(
    (balance) => balance.asset === "USDC" && balance.issuer === X402_TESTNET_USDC.issuer,
  );
  if (!destination.exists) throw new Error("stellar_account_not_active");
  if (!trustline) throw new Error("x402_usdc_trustline_required");

  const source = await getStellarTestnetAccount(distributor.publicKey());
  const sourceUsdc = source.balances.find(
    (balance) => balance.asset === "USDC" && balance.issuer === X402_TESTNET_USDC.issuer,
  );
  if (!source.exists || Number(sourceUsdc?.balance ?? 0) < Number(INTERNAL_TESTNET_USDC_DRIP)) {
    throw new Error("testnet_usdc_faucet_empty");
  }

  const server = new Horizon.Server(STELLAR_TESTNET_HORIZON);
  const sourceAccount = await server.loadAccount(distributor.publicKey());
  const transaction = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.payment({
      destination: input.destination,
      asset: new Asset("USDC", X402_TESTNET_USDC.issuer),
      amount: INTERNAL_TESTNET_USDC_DRIP,
    }))
    .addMemo(Memo.text(`aa-${input.claimKey.slice(0, 24)}`))
    .setTimeout(60)
    .build();
  transaction.sign(distributor);
  const result = await server.submitTransaction(transaction);
  return { transactionHash: result.hash, amount: INTERNAL_TESTNET_USDC_DRIP };
}
