# Avalanche Fuji runtime readiness

Scope: AVAX-002 and AVAX-003 on `feat/multichain-wallet-foundation`.

This note covers only local runtime and dependencies. It does not authorize deployment, mainnet, wallet signatures, faucet requests, or fund movement.

## Supported runtime

- Node.js: `>=22.13.0`
- Package manager: `npm@11.6.1`
- Reproducible install: `npm ci --no-audit --no-fund`
- `node_modules` must be a real directory inside this worktree, never a junction to the YC/main worktree.

OpenZeppelin Relayer packages currently warn that consumers should use pnpm. Their Node.js requirement is satisfied. This sprint retains npm because `package-lock.json` is the committed dependency graph; changing package managers must be a separate migration.

## Read-only doctor

```powershell
npm run runtime:doctor
npm run runtime:doctor -- --url=http://localhost:3001
```

It checks Node, dependency isolation, Next/tsx/Privy presence, application files, environment-variable presence (never values), Fuji RPC chain ID `43113`, and optionally localhost HTTP. It never creates wallets, requests faucet funds, signs, or submits transactions.

## Local acceptance

```powershell
npm ci --no-audit --no-fund
npm run runtime:doctor
npm run dev -- --port 3001
npm run runtime:doctor -- --url=http://localhost:3001
```

Expected: runtime/install pass; environment checks may warn when secrets are intentionally absent; Fuji returns `43113`; localhost returns `2xx` or `3xx`. Only then begin user-driven Privy login and wallet activation.

## Sprint execution evidence (2026-07-28)

- `node --version`: PASS, `v22.20.0`.
- First `npm ci --no-audit --no-fund`: stopped after 143 seconds with no completed install.
- Second bounded `npm ci --ignore-scripts --no-audit --no-fund`: stopped at the six-minute hard limit. It continued consuming CPU but never produced `node_modules/next/package.json`; no third install was attempted.
- Final package probe: tsx `4.23.1`, Privy React `3.35.0`, zod `4.4.3`, and Stellar SDK `16.0.1` present; Next.js package metadata missing.
- `npm run runtime:doctor`: 5 PASS, 4 WARN, 1 FAIL. Fuji RPC passed twice with chain ID `43113`; only runtime failure was missing Next.js. Environment warnings are expected because local secrets were not copied.
- Earlier focused tests run with the main worktree's tsx produced 6/8 passes; two failures were missing worktree packages (`zod/index.js` and `@stellar/stellar-sdk/index.js`) during the incomplete install, not assertion failures. Those package files are present after the second partial install, but the suite was not rerun because Next remains incomplete.
- Localhost/build/lint: BLOCKED by incomplete Next.js installation. No application failure is claimed, and no server was launched.

The deterministic remediation remains a completed `npm ci` in this worktree (ideally after investigating Windows antivirus/I/O or migrating the repository to pnpm in a separate change). Do not create an external `node_modules` junction.
