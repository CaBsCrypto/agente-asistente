import assert from "node:assert/strict";
import test from "node:test";
import {
  Account,
  Asset,
  BASE_FEE,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import {
  attachStellarSignature,
  DEFINDEX_TESTNET,
  formatStellarAmount,
  parseStellarAmount,
} from "../app/connectors/defindex";

test("parses Stellar amounts with seven decimal places", () => {
  assert.equal(parseStellarAmount("1"), BigInt(10_000_000));
  assert.equal(parseStellarAmount("0.0000001"), BigInt(1));
  assert.equal(formatStellarAmount(BigInt(12_345_678)), "1.2345678");
  assert.throws(() => parseStellarAmount("1.00000001"), /invalid_stellar_amount/);
  assert.throws(() => parseStellarAmount("0"), /stellar_amount_out_of_range/);
});

test("pins the public DeFindex Testnet vaults and exact USDC issuer", () => {
  assert.equal(
    DEFINDEX_TESTNET.xlm.vault,
    "CCLV4H7WTLJQ7ATLHBBQV2WW3OINF3FOY5XZ7VPHZO7NH3D2ZS4GFSF6",
  );
  assert.equal(
    DEFINDEX_TESTNET.usdc.vault,
    "CBMVK2JK6NTOT2O4HNQAIQFJY232BHKGLIMXDVQVHIIZKDACXDFZDWHN",
  );
  assert.equal(
    DEFINDEX_TESTNET.usdc.issuer,
    "GATALTGTWIOT6BUDBCZM3Q4OQ4BO2COLOAZ7IYSKPLC2PMSOPPGF5V56",
  );
});

test("attaches only a signature that matches the transaction source", () => {
  const signer = Keypair.random();
  const transaction = new TransactionBuilder(
    new Account(signer.publicKey(), "1"),
    { fee: BASE_FEE, networkPassphrase: Networks.TESTNET },
  )
    .addOperation(
      Operation.changeTrust({
        asset: new Asset(
          DEFINDEX_TESTNET.usdc.code,
          DEFINDEX_TESTNET.usdc.issuer,
        ),
      }),
    )
    .setTimeout(300)
    .build();

  const signature = signer.sign(transaction.hash());
  const signed = attachStellarSignature(
    transaction.toXDR(),
    signer.publicKey(),
    signature,
  );
  assert.equal(signed.signatures.length, 1);

  const other = Keypair.random();
  assert.throws(
    () =>
      attachStellarSignature(
        transaction.toXDR(),
        signer.publicKey(),
        other.sign(transaction.hash()),
      ),
    /invalid_privy_transaction_signature/,
  );
});
