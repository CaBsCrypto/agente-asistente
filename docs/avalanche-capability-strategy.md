<!-- Researched 2026-07-31 by a 12-agent workflow. Every on-chain claim below was probed with eth_call against Fuji; every protocol claim survived an adversarial verification pass. Nothing here was broadcast. -->

# Carmelita — qué construir después en Avalanche

Worktree leído: `D:\00 CODEX - OPENIA\agente-asistente-multichain` @ `feat/avalanche-x402-merchant-sdk`.
Todas las verificaciones on-chain citadas son `eth_call` contra `https://api.avax-test.network/ext/bc/C/rpc` (`eth_chainId` = `0xa869` = 43113), del 2026-07-31. **Nada fue transmitido a la red. No existe hash de transacción en Fuji para ninguna capacidad propuesta en este documento.**

---

## 1. Qué existe hoy

Siete entradas en `app/avalanche/capability-registry.ts`. Los nombres de campo reales son `operation`, `requires` y `approval` (no `kind`/`requirements`/`approvalMode`), y la unión de `approval` es `none | privy_single | privy_dual` — no existe `privy_session` como modo de aprobación; es un *requisito*.

| id | operation | estado declarado | qué es verdad hoy |
|---|---|---|---|
| `avalanche.docs.search` | read | (no consta en las notas de lectura) | Lectura de documentación vía MCP. |
| `avalanche.wallet.status` | read | (no consta) | Lee saldo y diagnóstico EVM desde `app/wallets/evm-rpc.ts`. |
| `avalanche.wallet.transfer` | financial | `ready_to_test` | Transferencia nativa de AVAX. Congela intención, idempotencia en `agent_activities.id`, firma cliente-side con Privy, evidencia verificada campo a campo contra la cadena. **No evalúa política de usuario.** |
| `dexalot.markets.list` | read | (no consta) | Catálogo de pares. Ver advertencia abajo sobre el chain id. |
| `dexalot.quote.read` | read | **`live`** | **Afirmación falsa en código enviado.** El endpoint devuelve `{"success":false}` para AVAX/USDC y `QP-002 Circuit Breaker active` para los otros pares, reproducido dos días seguidos con los parámetros exactos de `app/connectors/dexalot.ts:150-163`. El `nextAction` de la fila le dice al usuario que pida justo el par que falla. |
| `circle.cctp.fuji_to_stellar` | cross_chain | (no consta) | Único camino financiero que sí llama `evaluateUserAction` (`app/api/agent/bridge/cctp/execute/route.ts:206`). |
| `x402.report.purchase` | financial | `live` | Su propio campo `evidence` admite que el servidor entrega bajo la palabra del facilitador y nunca lee la cadena. `getEvmTransactionEvidence` no se usa en `app/x402-avalanche/settlement.ts`. |

**La brecha honesta**, en tres puntos:

1. **El registro es metadata pura.** No hay `route`, `handler` ni referencia a conector. Nada mapea un id de capacidad al código que lo ejecuta. Registrar una capacidad otorga cero capacidad de ejecución; el cableado son siete ediciones manuales separadas.
2. **La política de usuario no cubre Avalanche.** `evaluateUserAction` se llama desde chat-store, CCTP, DeFindex, Soroswap y x402-Stellar. La ruta de transferencia Fuji y la ruta x402-Avalanche no la llaman en absoluto.
3. **El motor genérico existe y no se usa.** `app/orchestration/workflow.ts` implementa exactamente el ciclo de vida del brief (`validate_request → check_connection → prepare_action → evaluate_policy → approval_gate → execute_once → verify_evidence`), con `digestPreparedAction` haciendo SHA-256 sobre serialización canónica. Pero `app/orchestration/connectors/` contiene solo `notion.ts` y `unblck.ts`. Ninguna capacidad Avalanche implementa `AgentConnector`.

Además, `tests/avalanche-capabilities.test.ts:8` afirma `capabilities.length === 7`. Cualquier fila nueva rompe ese test hasta actualizarlo.

---

## 2. La verdad por vertical

### 2.1 Swaps

**Sí se puede en Fuji hoy, con un solo camino: AVAX nativo → USDC de Circle en Pangolin V2.** Simulado con éxito vía `eth_call` con override de saldo; no transmitido.

Tres hechos que definen el diseño:

- **Hay dos tokens llamados "USDC" en Fuji y las dos investigaciones citan venues distintos.** El USDC de Circle `0x5425890298aed601595a70AB815c96711a31Bc65` es el que ya usa todo el stack: `testUsdcAddress` en `app/wallets/networks.ts`, el activo de CCTP en `app/connectors/circle-cctp.ts`, el activo de x402 en `app/x402-avalanche/config.ts`, y la reserva 0 de Aave V3 Fuji. El pool profundo de LFJ cotiza otro token, el USDC de prueba de LFJ `0xB6076C93701D6a07266c31066B298AeC6dd65c2d`. LFJ sí puede rutear hacia el USDC de Circle, pero solo por un pool polvo de Joe V1 (`0x8436B8c7...`, 0.997 USDC de reserva) con 48.9% de impacto en 1 AVAX. El venue con más liquidez no produce el token que el resto del stack consume.
- **Hay dos despliegues vivos de Pangolin en Fuji y cotizan 13x distinto.** El router documentado en `docs.pangolin.exchange` (`0x2D99ABD9008Dc933ff5c0CD271B88309593aB921`, factory `0xE4A575...`, 4472 pares) cotiza 1 WAVAX = 11.082805 USDC de Circle. El router del SDK (`0x688d21b0...`, factory `0x2a496ec9...`, 1007 pares) cotiza 149.33 en su propio par. Hay que fijar el router documentado como literal.
- **Los dos guardas del swap los aplica el contrato, no nuestra app.** Simulado: `minOut = 11.5 USDC` revierte `PangolinRouter: INSUFFICIENT_OUTPUT_AMOUNT`; `deadline = 1` revierte `PangolinRouter: EXPIRED`.

El pool tiene 496.22 USDC y 43.64 WAVAX. Es poco: 1 AVAX mueve el precio ~2%. El agente nunca debe afirmar profundidad de mercado y debe topear el tamaño.

Dexalot no es una salida: `/api/rfq/firm` responde `FQR-001 No api key provided` sin registro autoservicio detectable, y no se pudo ubicar ninguna dirección `MainnetRFQ` en Fuji (docs, repo de contratos y cinco rutas de API, todas 404). Esto último es ausencia de evidencia, no prueba de ausencia — queda **UNVERIFIED**.

### 2.2 Pools, lending y yield

**Parcialmente. Un solo write es demostrable en Fuji: `supply`/`withdraw` de USDC en Aave V3.** Todo lo demás en este vertical es lectura de mainnet.

- **Aave V3 Fuji funciona y no está mantenido.** Las dos cosas a la vez. `Pool.supply(USDC, 1e6, ...)` revierte con `ERC20: transfer amount exceeds allowance`, lo que prueba que `ValidationLogic` pasó todos los chequeos de activo/congelado/pausado/cap y la ejecución llegó al `transferFrom` real, fallando solo por la falta de allowance de la sonda. `Pool.withdraw(USDC, 1e6, sonda)` revierte con error `32` (NOT_ENOUGH_AVAILABLE_USER_BALANCE), mismo razonamiento. Y al mismo tiempo: Aave sacó Fuji de su propio frontend (no hay `proto_fuji_v3` en `aave/interface` `marketsConfig.tsx`) y de su GraphQL (`api.v3.aave.com/graphql` devuelve 22 cadenas cuya única `isTestnet:true` es Base Sepolia 84532). La última transacción externa directa al Pool fue 2026-03-24; el estado de la reserva tiene 40 días de antigüedad. Es infraestructura dormida que todavía funciona, sin soporte del proveedor.
- **`withdraw` tiene que salir en el mismo hito que `supply`.** Un depósito que no se puede demostrar retirando es una trampa. Además, Aave no puede mostrarnos la posición: sin el read propio construido desde RPC crudo, el agente tomaría un depósito que no puede leer de vuelta.
- **`borrow` está bloqueado por decisión de producto, no por la cadena.** `getConfiguration(WAVAX)` decodifica `BORROWING_ENABLED = 0`, así que "pedir prestado AVAX" revierte con error `30` y no puede existir. USDC sí tiene borrow habilitado (`borrow(USDC)` revierte con `34`, COLLATERAL_BALANCE_IS_ZERO). El bloqueo real es que endeudarse crea una exposición a liquidación que persiste *después* de la acción, y este proyecto no tiene concepto de posición monitoreada, ni alerta, ni desarme.

Lo que se descarta con evidencia: BENQI (bytecode cero en 43113 para sAVAX y Comptroller), Yield Yak (router sin bytecode; `staging-api.yieldyak.com/43113/farms` → 404), Silo (`fuji.json` 404, `avalanche.json` 200), Euler (`addresses/` tiene 43114, no 43113), GMX v2 (contratos desplegados, pero `DepositHandler 0x12383b2A` tiene exactamente una transacción externa en toda su historia — su propio despliegue de 2025-08-21 — y ningún keeper ejecutó jamás un depósito). El vault ERC-4626 `stataFujUSDXv2` tiene `totalSupply = 0` y su aToken subyacente también; `convertToAssets(1e18) == 1e18` es la identidad degenerada de un vault nunca tocado, no evidencia de que funcione.

Y una advertencia operativa: el sAVAX de Fuji que circula ampliamente, `0x56bbcc9149A355E8fF7A5B676C67Eec33a12F613`, es un mock ERC-20 de 2316 bytes con `totalSupply` fijo en exactamente 1e27 y sin mecánica de staking. Cablearlo habría producido un rendimiento de staking líquido completamente inventado.

### 2.3 NFT

**El análisis sí corre hoy y sin API key. La interacción es alcanzable a nivel de contrato pero el venue está comercialmente muerto: cero trades liquidados desde 2023-09-22.**

- **Lo que funciona ahora.** Glacier (`glacier-api.avax.network`) y Routescan sirven colecciones, tokens, `ownerAddress`, `tokenUri`, `metadata` y transferencias de Fuji sin credenciales. El acceso sin key es tolerancia no documentada, no un plan de producto: las respuestas no traen ningún header de rate limit y la documentación no menciona autenticación. Hay que tratar 401/403/429 como estado esperado y degradar a Routescan.
- **Lo que no funciona como se creía.** Rareza y traits sobre mainnet: Glacier devuelve `attributes` en 10/10 tokens del SampleNFT de Fuji, y 0/10 en dos colecciones reales de mainnet (Monkeez y Chikn, ambas `INVALID_TOKEN_URI`). El mismo endpoint, sin los datos. La única analítica que sobrevive en ambas redes es la derivada de `ownerAddress`: concentración y distribución de holders.
- **Floor price y volumen: no hay fuente.** OpenSea v2 devuelve 401 y el supuesto endpoint de key instantánea sin registro (`POST /auth/keys`) devuelve 404. `api.joepegs.dev` devuelve 401. Reservoir cerró su API el 2025-10-15 y `api-avalanche.reservoir.tools` ya no resuelve. SimpleHash cerró el 2025-03-27. Moralis lista solo Avalanche mainnet `0xa86a`. Desbloquear esto requiere que una persona consiga una key.
- **Para escribir, la elección es Seaport 1.6, no Joepegs.** Joepegs en Fuji está correctamente configurado — verifiqué `domainSeparator()`, que el `CurrencyManager` lista exactamente una moneda (WAVAX, y el USDC de Fuji **no** está whitelisted), y la trampa real: la estrategia publicada en los artefactos Fuji del propio repo (`0xd64162262cA995fC2eA31ee89B3a73a1A493A908`) devuelve `isStrategyWhitelisted = false`, mientras `0xdb9660c436dec824b379c59e2411c71f548f76a7` devuelve `true`. Pero sus proxies son actualizables por un único EOA sin mantenimiento (`0xdb40a7b7...`, repo archivado, último push de código 2023-09-15), así que la semántica de una orden firmada puede cambiar por debajo. Seaport 1.6 en `0x0000000000000068F116a894984e2DB1123eB395` es inmutable, no tiene whitelist de monedas y acepta consideración en AVAX nativo — lo que elimina el wrap y el approve del lado comprador.
- **"End-to-end" todavía no está ganado.** Nadie en este proyecto construyó, firmó ni simuló una orden de Seaport en Fuji. Y cuando exista, Carmelita habrá sido maker y taker a la vez, porque no hay contraparte. La narración de la demo tiene que decirlo.

Una lista en Fuji no aparece en `joepegs.com` ni en `opensea.io` — el enum `Chain` de `opensea-js` tiene 28 entradas mainnet y cero testnets.

### 2.4 Mercados de predicción

**No existen mercados de predicción en Avalanche. Ni en Fuji ni, en términos prácticos, en la C-Chain.** Esa es la respuesta directa a tu pregunta.

El número, recomputable por cualquiera: se descarga `https://api.llama.fi/protocols`, se filtra `category === "Prediction Market"` y salen 115 protocolos con $400,894,687.14 de TVL sectorial repartidos en 49 cadenas distintas. La porción de Avalanche es **$200.4097**, de exactamente dos protocolos: `dripit` ($200.40, su sitio no resuelve, curl exit 000) y `NODO` ($0.008). Ninguna subnet ni L1 de Avalanche aparece entre las 49. Los venues grandes están en otra parte: Polymarket es Polygon 137 y sus propias docs llaman a esa lista "the single source of truth" sin mencionar testnet alguna; el `ChainId` del SDK de Azuro es `100|137|80002|88888|88882|8453|84532`, sin 43113 ni 43114; Overtime (ex-Thales) está en OP/Arbitrum/Base/Polygon/Ethereum/BSC; SX Bet en su propio rollup; Kalshi es off-chain más tokens SPL en Solana.

Los dos escapes que circulaban también fallan:

- **BetSwirl no es un mercado de predicción y probablemente no funciona.** Su bytecode en Fuji sí está confirmado (9 contratos, `eth_getCode` no vacío). Pero es un casino de VRF de Chainlink — coin toss, dice, roulette, keno, wheel, plinko, según su propio SDK. Y `getChainlinkVRFCost(token, 1)` en CoinToss devuelve 0 tanto para nativo como para WAVAX, y el wrapper de VRF devuelve 0 en `calculateRequestPriceNative(200000,1)`. Un wrapper de direct funding vivo y financiado no cotiza cero. Sumado a 11.5 meses de inactividad total, un subgraph Fuji que responde `{"message":"Not found"}`, un SDK sin publicar desde 2025-11-07 y un `github.com/BetSwirl/sdk` que da 404. Una apuesta contra un VRF roto se toma y nunca se resuelve.
- **Azuro en Polygon Amoy tiene el indexador vivo y el venue muerto.** El subgraph reporta un bloque con timestamp 2026-07-31T22:08Z y sin errores de indexación, pero el juego más nuevo jamás creado tiene `createdBlockTimestamp` de 2025-05-07, y una consulta por cualquier juego con `startsAt` futuro devuelve arreglo vacío. El partido citado como prueba de vida ("Real Sociedad – RC Celta de Vigo") empieza el 2025-05-13 y está en estado `Paused`. Que un subgraph devuelva filas prueba que hay un indexador corriendo, no que haya algo apostable.

Lo que sí se puede enviar: inteligencia de mercados de predicción en modo lectura. Siete endpoints reverificados sin autenticación (Polymarket Gamma y CLOB, Kalshi producción y demo, Limitless, SX Bet, DefiLlama). Cada byte es mainnet u off-chain, y la fila del registro tiene que decirlo — `testnet only` es una restricción sobre dónde se mueve valor, y una lectura que sirve datos de mainnet en silencio es exactamente el modo de falla que este proyecto no puede permitirse.

Nota regulatoria para un operador residente en Chile: mostrar precios no es apostar, pero la interfaz no debe ofrecer nunca un affordance de "apostar". El proyecto de ley de apuestas en línea está en segundo trámite constitucional en el Senado, con suma urgencia otorgada el 2026-05-07, y las apuestas en línea hoy no están autorizadas.

---

## 3. Capacidades propuestas

Ordenadas por leverage. **Todas son `planned` el día que se transcriben**: cero código de aplicación existe para cualquiera de ellas. `ready_to_test` en este proyecto significa "el código existe y pasa tests automatizados, falta una corrida real" — no "la dependencia externa está verificada". Las filas marcadas "sin bloqueo externo" pasan a `ready_to_test` en el mismo commit que aterriza su ruta y sus tests.

| id | tipo | estado | aprobación | esfuerzo | qué desbloquea |
|---|---|---|---|---|---|
| `dexalot.quote.read` *(enmienda)* | read | `planned` — bloqueada aguas arriba | none | S | Retira una afirmación falsa de código enviado. Debe preceder a cualquier fila nueva. |
| `predictions.sector.read` | read | `planned` — sin bloqueo externo | none | S | Responde la pregunta de mercados de predicción con un cálculo que un tercero puede repetir. |
| `avalanche.aave.market.read` | read | `planned` — sin bloqueo externo | none | S | Establece el conector Aave. Prerequisito de todo lo de lending. |
| `avalanche.aave.position.read` | read | `planned` — sin bloqueo externo | none | S | Hace demostrable cualquier depósito posterior. Sin esto, `supply` es deshonesto. |
| `avalanche.nft.collection_read` | read | `planned` — sin bloqueo externo | none | M | Abre el conector Glacier; las tres capacidades NFT de lectura siguientes salen casi gratis. |
| `avalanche.nft.holder_distribution` | read | `planned` — sin bloqueo externo | none | S | Única analítica NFT que sobrevive en Fuji y en mainnet. |
| `avalanche.nft.provenance_read` | read | `planned` — sin bloqueo externo | none | S | Verificación cruzada de dos indexadores. Es también cómo se verifica después cualquier write NFT. |
| `avalanche.nft.venue_status` | read | `planned` — sin bloqueo externo | none | M | Preflight obligatorio de cualquier write NFT. Su trabajo es devolver la respuesta incómoda. |
| `predictions.markets.read` | read | `planned` — sin bloqueo externo | none | M | Precios de venues reales, todos mainnet/off-chain, etiquetados como tales. |
| `lfj.swap.quote.read` | read | `planned` — sin bloqueo externo | none | S | Segunda opinión de liveness. Nunca una afirmación de precio. |
| `defillama.yields.read` | read | `planned` — sin bloqueo externo | none | S | Contexto de rendimientos de mainnet, con la cadena de origen en la misma pantalla. |
| `pangolin.swap.avax_to_usdc` | financial | `planned` — bloqueada por trabajo interno | privy_single | L | Primer write no trivial. Una sola firma, cero superficie de allowance, y produce el USDC exacto que consumen CCTP, x402 y Aave. |
| `avalanche.aave.supply` | financial | `planned` — bloqueada por trabajo interno | privy_dual | L | Rendimiento real en Fuji vía permit EIP-2612: aprobación por monto exacto, sin transacción de approve. |
| `avalanche.aave.withdraw` | financial | `planned` — bloqueada por trabajo interno | privy_single | M | Hace honesto a `supply`. Sale en el mismo hito, no después. |
| `avalanche.wavax.wrap` | financial | `planned` — bloqueada por trabajo interno | privy_single | L | Llamada a contrato de riesgo mínimo (sin contraparte, reversible por el usuario). Prescindible si el swap prueba el primitivo antes. |
| `avalanche.nft.mint_demo_token` | financial | `planned` — bloqueada por trabajo interno + control de acceso UNVERIFIED | privy_single | M | Inventario propio para la demo NFT. |
| `avalanche.nft.approve_single_token` | financial | `planned` — bloqueada por trabajo interno | privy_single | M | Aprobación por token único, autorrevocable en la transferencia. Es donde la regla de "nunca approve infinito" se aplica de verdad. |
| `seaport.listing.sign` | financial | `planned` — construcción de orden UNVERIFIED en Fuji | privy_single | L | Firma EIP-712 con `endTime` acotado. No gasta gas, y aun así es financiera. |
| `seaport.order.fulfill` | financial | `planned` — bloqueada por tabla multi-paso | privy_dual | XL | Cierra el ciclo NFT. Requiere la tabla fila-por-paso; no empezar antes. |
| `avalanche.nft.floor_read` | read | `planned` — sin fuente | none | S | Fila solo-documentación: registra los cuatro callejones sin salida para que nadie los reinvestigue. |
| `pangolin.pool.add_liquidity` | financial | `planned` | privy_dual | XL | LP. Alta superficie por poco valor de demo sobre un pool de 496 USDC. |
| `lfj.swap.erc20_in` | financial | `planned` | privy_dual | XL | Expone todas las debilidades arquitectónicas a la vez. Por eso no va primero. |
| `avalanche.aave.borrow` | financial | `planned` — bloqueada por decisión de seguridad | privy_dual | XL | Requiere primero lectura de frescura de oráculo y monitoreo de salud de posición. |

Notas de transcripción al archivo real: cada id debe agregarse a `avalancheCapabilityIdSchema` (`app/avalanche/capability-registry.ts:3-7`) o `getAvalancheCapability` lanza `avalanche_capability_not_found`. El registro no tiene estado `blocked` — las filas bloqueadas van como `planned` con el bloqueador textual en `nextAction`. Hacen falta dos valores nuevos en la unión `Requirement` (línea 9), cada uno con tres ediciones coordinadas — la unión, el mapa `contextKey` de la línea 30 y el tipo `AvalancheCapabilityContext`: `fuji_nft_owned` (→ `fujiNftOwned`) y, opcionalmente, `fuji_wavax`. `fuji_usdc` no sirve para NFT: el USDC de Fuji no está whitelisted en el `CurrencyManager` de Joepegs.

Falta también un campo opcional `dataScope: "fuji_onchain" | "mainnet_readonly" | "offchain_api"`. La unión `network` es cerrada y sin miembro mainnet, y eso está bien y no debe relajarse. Pero `predictions.*` y `defillama.yields.read` consumen datos de mainnet, y hoy el esquema no tiene cómo decirlo: sin ese campo, hay que etiquetarlas `avalanche:fuji`, que es una afirmación falsa sentada dentro de un campo de esquema.

---

## 4. Lo que hay que cambiar en el motor

### 4.1 El problema del approve ERC-20 — la bifurcación real

Hoy, `app/wallets/evm-rpc.ts` solo puede preparar una **transferencia de valor nativo**: `estimateEvmNativeTransfer` (línea 125) no tiene campo `data`, y `getEvmTransactionEvidence` (línea 157) no compara calldata en absoluto. La única maquinaria de llamada a contrato del repo, `app/cctp/evm.ts`, está cableada a CCTP: ABIs fijos, direcciones fijadas a `CCTP_TESTNET`, y una unión `CctpEvmActionKind = "approve" | "burn"` de dos valores.

Peor: el nonce hace los pasos estrictamente seriales. `prepareCctpEvmPreview` congela `getTransactionCount(blockTag:"pending")` y `verifyCctpEvmTransaction:183` exige igualdad exacta. Entonces el paso *k+1* no se puede preparar hasta que el paso *k* esté minado, y el preview expira en 5 minutos — por eso existe `refresh_evm` como acción separada. Cualquier diseño approve-luego-llamada hereda un ida y vuelta prepare→firma→espera→re-prepare→firma con ruta de refresh por paso, más una rama de cuarentena `reconciliation_required`.

**La bifurcación es esta: o se construye esa maquinaria serializada, o se diseñan las capacidades para no necesitarla.** Hay dos caminos que la evitan por completo, y los dos están verificados:

- **Entrada en AVAX nativo: cero approvals.** `swapExactAVAXForTokens` en Pangolin no toca ninguna allowance. Una firma.
- **EIP-2612 permit sobre el USDC de Circle.** Verificado directamente: `name` = "USD Coin", `version` = "2", `decimals` = 6, `nonces()` funcional, y `DOMAIN_SEPARATOR()` = `0xfe9fa105a0e9629446730e544caa6b8d05d8d4fc93451750dc50e2ddd6d374b3`, que recomputé desde esos mismos campos de dominio y coincide byte a byte; `permit()` con firma basura revierte `ECRecover: invalid signature`, así que es una implementación real y no un stub. **La aprobación por monto exacto y con deadline cuesta una firma off-chain y cero transacciones adicionales.** El approve infinito no solo está prohibido: es innecesario.

El USDC de prueba de LFJ **no** tiene permit — `DOMAIN_SEPARATOR`, `version` y `nonces` revierten todos. Ese es el motivo por el que `lfj.swap.erc20_in` está diferido y no es la primera capacidad: obligaría a una transacción de approve separada y a toda la serialización de nonce descrita arriba.

Advertencia sobre el permit en Aave: Aave V3 envuelve la llamada a permit en `try/catch`, así que un permit malformado **no revierte ruidosamente** — cae silenciosamente al `transferFrom` y falla por allowance. La ruta tiene que verificar la allowance on-chain *entre* las dos firmas, en vez de confiar en que el permit aterrizó.

Para NFT el equivalente es peor que el approve infinito de ERC-20: `setApprovalForAll(operator, true)` otorga autoridad ilimitada sobre **todos** los tokens de una colección, presentes y futuros, sin monto que lo acote. Se prohíbe en la capa de congelamiento — el selector `0xa22cb465` no puede ser producido por el freezer, y esa prohibición es un campo del digest (`forbiddenSelectors`), no una convención de interfaz. La primitiva permitida es `approve(operator, tokenId)`: un token, y ERC-721 la limpia en la transferencia, así que la concesión se autorrevoca al usarse. Queda **UNVERIFIED** si un approve por token único satisface la ruta de transferencia del venue elegido; se resuelve por simulación `eth_call`. Si un venue exige `setApprovalForAll`, se rechaza el venue, no la regla.

### 4.2 Cambios concretos, en orden de dependencia

1. **`app/wallets/evm-rpc.ts`** — agregar `prepareEvmContractCall(network, from, to, data, valueWei)` y `verifyEvmContractCall(preview, hash)`. Copiar la *disciplina de verificación* de `verifyCctpEvmTransaction` (`app/cctp/evm.ts:177-186`), que ya compara chainId, from, to, **`transaction.input` byte a byte**, value y nonce — es más estricta que `getEvmTransactionEvidence`, que no revisa calldata. viem ya es dependencia (`app/cctp/evm.ts` importa `createPublicClient`, `encodeFunctionData`, `avalancheFuji`).
2. **Helper de congelamiento/verificación de typed data.** `app/x402-avalanche/privy.ts:42` ya implementa la mitad cliente para EIP-712 (`explicitUserConfirmation`, re-lectura de `eth_chainId`, rechazo si ya está firmado). Generalizarlo para que un permit EIP-2612 reutilice esa ruta en vez de bifurcarla.
3. **Tabla fila-por-paso `agent_evm_calls`**, con `idempotency_key text NOT NULL UNIQUE` **y** `UNIQUE(action_id, step_index)`, más una columna de estado con transiciones compare-and-swap al estilo de `app/x402-avalanche/store.ts:222/245/265`. Esto reemplaza el antipatrón columna-por-paso de `app/cctp/store.ts`, donde el execute-once del paso *k* **es** la restricción UNIQUE sobre la columna literal `approve_tx_hash` / `burn_tx_hash` / `mint_tx_hash`. Una secuencia de N pasos necesita hoy una tabla de N columnas; una secuencia de largo variable no tiene representación.
4. **Persistirla con una migración drizzle** en `drizzle/` y un export en `db/schema.ts`. Las dos tablas Avalanche existentes se crean con `CREATE TABLE IF NOT EXISTS` en tiempo de request (`ensureAvalancheX402Schema` en `app/x402-avalanche/store.ts:70`, `ensureCctpSchema` en `app/cctp/store.ts:61`); ninguna aparece en `db/schema.ts` y un grep de `drizzle/*.sql` por `avalanche|cctp` no devuelve nada. La garantía de ejecución única es una garantía de base de datos, y una garantía de base de datos que vive en un camino de código que puede o no haber corrido no es una garantía.
5. **Llamar `evaluateUserAction`** (`app/agent-memory-store.ts:257`) desde cada ruta financiera nueva, modelando sobre `app/api/agent/bridge/cctp/execute/route.ts:206`. Y **arreglar primero el matching de símbolo de `spend_limit`** (`app/agent-memory.ts:254-260`): compara strings de símbolo en mayúsculas, y `parseVaultCommand` (`app/agent-memory.ts:62`) usa XLM por defecto cuando el usuario no nombra activo. Un límite que el usuario cree global no restringe una acción en AVAX. Además hay que aliasear WAVAX→AVAX. Sin ese arreglo, las llamadas a política son decorativas.
6. **Factorizar el borde de ruta.** Cada ruta reimplementa `sameOrigin()` + `bearerToken()` + `verifyPrivyAccessToken` + `zod.discriminatedUnion("action", …)` + `Cache-Control: no-store` + `runtime="nodejs"`. No hay middleware compartido. Este trabajo agrega hasta ocho rutas; ocho copias a mano son ocho lugares independientes donde omitir un chequeo.
7. **Mantener todo en el camino de parsers deterministas** (`app/wallets/avalanche-intents.ts`, `app/connectors/avalanche-read-intents.ts`). El planner LLM no puede expresar nada de esto: su enum de intents (`app/agent-planner.ts:6-18`) es Stellar/Notion, sus activos son `XLM|USDC`, su regex de monto es `^\d+(?:\.\d{1,7})?$` — 7 decimales, que no expresan wei de 18 ni atómicos de 6 — y su system prompt fija `"network": "stellar:testnet"`. Ampliarlo pondría campos que determinan precio (`pairBinSteps`, `versions`, mínimo recibido) bajo control del LLM, lo que viola la invariante plan-only mucho más que mantener parsers deterministas.

Cada intent nuevo son siete puntos de edición: parser, el booleano `hasDeterministicIntent` (`app/agent-chat-store.ts:493`), la rama `else if` (~línea 582), el espejo en `app/agent-chat-logic.ts:360`, la unión discriminada de action cards (`agent-chat-store.ts:81` y `agent-chat-logic.ts:12`), la fila del registro más el enum, y la ruta.

**El movimiento de mayor leverage que no está en esa lista**: `app/orchestration/connectors/avalanche.ts` implementando `AgentConnector` sobre `prepareEvmContractCall`. Eso convierte "cada capacidad escribe su propio ciclo de vida a mano" en "cada capacidad declara su calldata". No lo prototipé — es una recomendación de diseño, **UNVERIFIED**.

---

## 5. Secuencia recomendada

### Ola 1 — demostrable en días

Siete lecturas sin key, sin firma, sin primitivas nuevas, más una transmisión real de lo que ya existe.

**La evidencia verificable de esta ola es `avalanche.wallet.transfer`.** Ya está en `ready_to_test`, es una transferencia nativa que no necesita ninguna primitiva nueva, y su ruta ya congela la intención, aplica idempotencia a nivel de base de datos y verifica la evidencia campo a campo contra la cadena vía `getEvmTransactionEvidence`. Ejecutarla de verdad en Fuji produce el primer hash de transacción que este trabajo puede citar. Junto con eso, agregarle la llamada a `evaluateUserAction` que hoy le falta.

El resto de la ola: `predictions.sector.read`, `avalanche.aave.market.read`, `avalanche.aave.position.read`, `avalanche.nft.collection_read`, `holder_distribution`, `provenance_read`, `venue_status`, `predictions.markets.read`, y la fila `avalanche.nft.floor_read` como documentación. La verificabilidad de estas es de otro tipo: cada respuesta lleva su fuente, su timestamp y su bloque, de modo que un tercero corre la misma consulta y llega al mismo número.

**Primer commit:** bajar `dexalot.quote.read` de `live` a `planned`, mover el bloqueador textual (circuit breaker QP-002, reproducido con los parámetros exactos del conector) al campo `nextAction`, reescribir el `evidence`, y actualizar `tests/avalanche-capabilities.test.ts:8`. Cuesta casi nada y retira una afirmación falsa. Agregar filas honestas junto a una fila falsa no arregla el registro.

### Ola 2 — el trabajo estructural

`prepareEvmContractCall` / `verifyEvmContractCall`, la tabla `agent_evm_calls` con migración drizzle real, el helper de EIP-712 generalizado, la llamada a política en todas las rutas financieras, y el arreglo del matching de símbolo de `spend_limit`. Sin salida visible para el usuario; todo lo demás depende de esto.

**Primer commit:** agregar el campo `data` al preview EVM en `app/wallets/evm-rpc.ts` y extender `getEvmTransactionEvidence` para exigir `transaction.input === preview.data` byte a byte, levantando la comparación que ya existe en `app/cctp/evm.ts:181` en vez de copiarla por tercera vez. Con un test que verifique que un calldata alterado es rechazado.

### Ola 3 — lo que espera

Lo que la Ola 2 habilita, en este orden: `pangolin.swap.avax_to_usdc` (una firma, cero allowances, y produce el USDC de Circle que consume todo el stack), luego `avalanche.aave.supply` y `avalanche.aave.withdraw` juntas. Eso deja una narrativa demostrable coherente en un solo token: financiar por CCTP o faucet, cambiar AVAX a USDC de Circle en Pangolin, depositar en Aave con permit, leer la posición, retirar.

Lo que espera más allá de eso: `avalanche.nft.mint_demo_token` y `approve_single_token`, después `seaport.listing.sign`, y al final `seaport.order.fulfill`, que no debe empezar hasta que la tabla fila-por-paso sea real. `pangolin.pool.add_liquidity`, `lfj.swap.erc20_in` y `avalanche.aave.borrow` quedan fuera de las tres olas.

**Primer commit:** `app/connectors/pangolin-fuji.ts` con el router documentado fijado como literal, `router.factory()` y `factory.getPair()` releídos y afirmados en tiempo de preparación, y `getAmountsOut` devolviendo la cotización con su número de bloque.

---

## 6. Lo que NO vamos a construir, y por qué

**Por ausencia de despliegue en testnet:**

- BENQI, Yield Yak, Silo, Euler — cero bytecode o cero direcciones en 43113. Solo pueden ser analítica de mainnet, que `defillama.yields.read` ya cubre genéricamente.
- Uniswap v3 en Avalanche — 43114 únicamente. LI.FI declara explícitamente "We no longer support testnets". 0x devuelve 401 y no lista testnets. KyberSwap sirve mainnet sin key pero `/fuji/` es un 404 duro, no un endpoint degradado. Odos terminó todos sus servicios el 2026-07-30.
- Cualquier ejecución en Azuro, Polymarket, Overtime, SX Bet o Limitless — ninguno tiene despliegue en Avalanche y Polymarket no tiene testnet de ningún tipo.
- Kalao — `kalao.io` y `docs.kalao.io` no resuelven; `www.kalao.io` sirve una página de parking de Namecheap. Salvor — su bundle de frontend referencia 43114 cinco veces y 43113 cero veces. Campfire — devuelve 403 a cualquier cliente no-navegador y no publica docs, API ni direcciones.

**Por estar desplegado pero roto:**

- GMX v2 en Fuji. Los contratos existen, pero ningún keeper ejecutó jamás un depósito, mientras los usuarios seguían enviando órdenes hasta 2026-06-07. Una orden colgada es peor que una capacidad bloqueada, porque el agente reportaría éxito al enviarla.
- BetSwirl, en cualquier forma. Tres motivos independientes: no es un mercado de predicción (es un casino), el precio de VRF cotiza cero en dos capas, y una apuesta contra un VRF roto se toma y no se resuelve. Nota: el diagnóstico que circula ("revisar el balance de la suscripción VRF") tampoco funciona — `getChainlinkConfig()` no devuelve ningún id de suscripción, Fuji usa VRF 2.5 con direct funding, y `getSubscription(1)` revierte con `InvalidSubscription()`.
- La ejecución RFQ de Dexalot. Dos bloqueos: `FQR-001 No api key provided` sin registro autoservicio, y ninguna dirección `MainnetRFQ` de Fuji localizable. El endpoint de precio además está con circuit breaker.
- El vault ERC-4626 `stataFujUSDXv2` y su factory. Cero depósitos jamás, factory sin tocar desde 2024-10-23. Es atractivo porque refleja exactamente el depósito de DeFindex en Stellar que ya está construido, que es precisamente por qué se habría propuesto sin mirar.
- Cualquier capacidad que toque el sAVAX falso `0x56bbcc9149A355E8fF7A5B676C67Eec33a12F613`.

**Por diseño, no por falta de disponibilidad:**

- **Approve infinito / `MaxUint256`**, sobre cualquier token y hacia cualquier contrato. `encodeCctpApprove` (`app/cctp/evm.ts:78`) ya codifica el monto exacto; ese precedente se mantiene. Con permit sobre el USDC de Circle, ni siquiera hay un costo por cumplirlo.
- **`setApprovalForAll`**, bajo cualquier justificación, incluida "es lo que hace todo frontend de NFT". Prohibido en la capa de congelamiento.
- **`withdraw(asset, type(uint256).max, to)`** como conveniencia de "retirar todo". Un monto no acotado no puede fijarse con un digest SHA-256, lo que vuelve la intención congelada inútil justo en el campo que más le importa al usuario. "Retirar todo" se resuelve a un entero concreto desde el balance del aToken en tiempo de preparación.
- **Comparación de precios entre venues presentada como "mejor ejecución".** Los pools de Fuji no están arbitrados y, peor, los venues cotizan tokens distintos: LFJ cotiza su propio USDC de prueba, Pangolin cotiza el de Circle, y los dos despliegues de Pangolin difieren 13x entre sí sobre el mismo par (11.08 vs 149.33 USDC por WAVAX, ambos medidos hoy). Decirle a un usuario "revisé dos DEX" sería una afirmación materialmente falsa sobre calidad de ejecución. Lectura de segunda fuente solo como chequeo de liveness.
- **Un swap de LFJ presentado al usuario como comprando "USDC".** El token de salida no es el USDC de Circle, no es el activo de acuñación de CCTP, no es el activo de pago de x402, no es una reserva de Aave, y no tiene permit. Los chequeos de saldo de la propia billetera no lo verían.
- **Permit2** (`0x000000000022D473030F116dDEE9F6B43aC78BA3`), pese a estar genuinamente desplegado en Fuji con `DOMAIN_SEPARATOR` válido. Ningún router de Fuji lo integra, así que usarlo requeriría desplegar un contrato ejecutor propio: superficie de confianza nueva y carga de auditoría nueva, para conseguir la misma propiedad que EIP-2612 ya entrega sin contrato nuevo.
- **La ruta de ejecución de Joepegs en Fuji**, pese a que sus precondiciones verifican perfectamente. Los proxies son actualizables por un único EOA sin mantenimiento. La lectura se conserva como `avalanche.nft.venue_status` para no perder el análisis.
- **La estrategia `0xd64162262cA995fC2eA31ee89B3a73a1A493A908`** — la dirección publicada en los artefactos Fuji del propio repo de Joepegs, y por lo tanto la primera que encontrará quien busque. No está whitelisted. La que sí lo está es byte-idéntica salvo el hash de metadata de solc, así que un diff de bytecode no las distingue, y el diagnóstico sugerido `viewProtocolFee()` revierte en las cuatro estrategias. Solo funciona la lectura del whitelist.
- **Rareza y traits sobre colecciones de mainnet** — los datos no están, aunque el endpoint sí.
- **Analítica de volumen y wash trading de marketplaces** — `nft.trades` de Dune no cubre Avalanche y en Fuji la muestra de por vida son 136 eventos.
- **Colocación de órdenes en el sandbox demo de Kalshi.** La lectura está incluida. La escritura se rechaza por principio, no por dificultad: requeriría una credencial guardada en servidor colocando órdenes en un exchange off-chain custodial. Sin clave Privy, sin billetera del usuario, sin cadena, sin evidencia on-chain — lo contrario de la tesis del proyecto. Demostraría el ciclo de congelar/aprobar/ejecutar-una-vez contra una contraparte a la que simplemente se le podría preguntar qué pasó.
- **Construir nuestro propio mercado de predicción en Fuji para llenar el hueco.** Haría al proyecto simultáneamente el venue, el oráculo, el creador de mercado y ambas contrapartes.
- **Publicar órdenes en OpenSea desde Fuji.** El enum `Chain` de `opensea-js` no tiene testnets. Una lista en Fuji es una orden directa al contrato de Seaport que OpenSea nunca indexará.
- **Agregar cualquier red mainnet a `walletNetworkIdSchema`** (`app/wallets/types.ts:9`, hoy cinco testnets y cero mainnets) o a la unión `network` del registro. `defillama.yields.read` consume datos de mainnet por HTTP sin que ninguna red mainnet entre jamás al esquema; esa es la separación correcta. Trampa concreta: el payload `/privapi/trading/environments` de Dexalot tipa sus entornos de testnet como `"type":"mainnet"` sobre chain 432201, así que una importación ingenua del catálogo violaría la invariante por accidente.
- **Rutear cualquiera de estas por el planner LLM en este hito.**

**Por regulación:**

- Cualquier affordance de "apostar" en la interfaz de mercados de predicción, para un operador residente en Chile. Mostrar precios no es apostar; ofrecer la apuesta sí. El proyecto de ley está en segundo trámite en el Senado y las apuestas en línea hoy no están autorizadas.

---

## 7. Riesgos y preguntas abiertas

**Marcado UNVERIFIED, es decir desconocido, no "probablemente bien":**

1. **Ninguna simulación fue transmitida.** Cada `eth_call` de este documento — el swap de Pangolin, el supply/withdraw de Aave, el borrow — es una simulación con override de estado. No existe hash de transacción en Fuji para nada de esto. Hasta que exista, la única redacción admisible es "simulado con éxito vía eth_call; no transmitido".
2. **La construcción de órdenes de Seaport en Fuji no está verificada en absoluto.** Nadie construyó, firmó, simuló ni ejecutó una orden. Concretamente sin verificar: que la consideración en AVAX nativo y `conduitKey = 0` se comporten en el despliegue de Fuji como en otras partes, y que `getOrderHash` e `information()` respondan como se espera.
3. **Si un approve por token único basta para la ruta de transferencia del venue elegido.** El `TransferManagerERC721` de Joepegs (`0x06f90fd0...`) y Seaport con `conduitKey = 0` deberían transferir vía `safeTransferFrom`, que honra una aprobación de token único — pero no leí el código de ninguno de los dos ni simulé un fill. Se resuelve por simulación antes de que la capacidad salga de `planned`.
4. **El control de acceso de `mint(address)` en el SampleNFT de Fuji** (`0xfBF22D7c...`). El contrato está confirmado desplegado y el selector está confirmado en el bytecode, pero no se hizo dry-run. Puede ser `onlyOwner`, en cuyo caso cada intento revierte y quema gas. Se resuelve con un `eth_call`, o desplegando un ERC-721 propio y la pregunta desaparece.
5. **Si existe alguna dirección `MainnetRFQ` de Dexalot en Fuji.** Búsqueda fallida en docs, repo de contratos y cinco rutas de API. Ausencia de evidencia, no prueba de ausencia.
6. **El acceso sin key a Glacier.** Funciona hoy, no devuelve ningún header de rate limit, y ninguna documentación establece que exista un nivel sin autenticación. Es tolerancia no documentada que puede retirarse sin aviso.
7. **La NFT API de Alchemy en Fuji.** Su página de Fuji la declara soportada; probarlo requiere una key que nadie obtuvo. Es el único desbloqueo plausible para floor price, dado que Reservoir y SimpleHash desaparecieron.
8. **`api.lfj.gg` y los hosts de oráculo de GMX Fuji** devolvieron HTTP 000 desde el entorno de verificación, lo que no distingue "no existe" de "egress bloqueado". No afirmar su inexistencia en ninguna dirección.
9. **Sin verificar independientemente: la transacción Fuji del 2026-07-31 que afirma el campo `evidence` de `x402.report.purchase`.** El propio `nextAction` de esa fila dice que la liquidación fue verificada a mano, no por la aplicación.
10. **`app/orchestration/connectors/avalanche.ts` implementando `AgentConnector`** es una recomendación de diseño sin prototipar.

**Riesgos que no son incógnitas sino consecuencias asumidas:**

- **Aave V3 Fuji está dormido.** Última transacción externa directa al Pool: 2026-03-24. Estado de reserva con 40 días. Sin soporte del proveedor, retirado de su frontend y de su GraphQL. Funciona; nadie lo mantiene. Si deja de funcionar, no hay a quién escribirle.
- **Los venues NFT de Fuji están comercialmente muertos.** Cero trades desde 2023-09-22; ninguna transacción de ningún tipo en Joepegs desde 2025-06-15; Seaport 1.6 en Fuji desde 2025-09-15. "Live" solo puede significar "desplegado y correctamente configurado", nunca "activo". Y una demo implica que Carmelita es maker y taker.
- **La liquidez de Fuji es delgada.** El par de Pangolin tiene 496.22 USDC y 43.64 WAVAX. En LFJ, 100 WAVAX producen 12.34% de impacto. Nunca afirmar profundidad; topear el tamaño por política.
- **Los ~140.9 aUSDC en el mercado de Aave Fuji y los 100 eventos TakerBid en Joepegs son actividad de otras personas.** Carmelita tiene cero depósitos y cero trades. Cero usuarios externos, cero ingresos, cero comerciantes pagando.
- **La invariante de política tiene un agujero hoy.** Hasta que se corrija el matching de símbolo en `app/agent-memory.ts:254-260`, un `spend_limit` que el usuario cree global no restringe una acción en AVAX. Cualquier capacidad financiera nueva que salga antes de ese arreglo tiene una política decorativa.
- **Tres tipos de política que `parseVaultCommand` no puede expresar** y que este trabajo necesita: vida máxima de una orden (para acotar `endTime` de Seaport), precio mínimo de venta y máximo de compra por colección (límites entrantes y salientes que `spend_limit` no representa), y una lista blanca de contratos y operadores. El tipo `authority` existente se guarda como `status:"draft"` y nunca se activa solo — no asumir que restringe nada.
- **Una cifra de rendimiento de mainnet junto a un botón de depósito en Fuji es una afirmación materialmente falsa**, aunque cada mitad sea individualmente cierta. La etiqueta de cadena debe renderizarse en la misma pantalla que el número, siempre.