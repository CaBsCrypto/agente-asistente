# MCP de agente-asistente

## Estado

Este repositorio expone un servidor MCP remoto funcional en `POST /api/mcp` mediante Streamable HTTP. La implementación actual es un **sandbox demostrativo**: no custodia activos, no firma wallets y no mueve fondos reales.

## Conexión

```json
{
  "mcpServers": {
    "agente-asistente": {
      "url": "https://agente-asistente.vercel.app/api/mcp"
    }
  }
}
```

Localmente, usa `http://localhost:3000/api/mcp`. También puedes probarlo con MCP Inspector.

```bash
npx @modelcontextprotocol/inspector@latest
```

## Herramientas

- `search_offers`: catálogo público, solo lectura.
- `get_offer`: detalle de una oferta.
- `create_intent`: prepara una operación sin ejecutarla; exige `idempotencyKey`.
- `evaluate_policy`: verifica expiración y límite demo de 100 USDC.
- `demo_authorize_intent`: confirmación explícita y token temporal; no firma una wallet.
- `execute_authorized_intent`: produce un recibo simulado; una repetición retorna el recibo original.
- `get_receipt`: consulta el comprobante.

## Flujo

1. Buscar y seleccionar una oferta.
2. Crear la intención con una clave idempotente estable.
3. Evaluar la política.
4. Mostrar importe, red y condiciones al usuario.
5. Obtener confirmación explícita.
6. Ejecutar usando el token temporal.
7. Guardar y verificar el recibo.

## WebMCP

`app/webmcp-registry.tsx` registra herramientas de búsqueda y preparación en `document.modelContext` cuando Chrome ofrece la API. WebMCP necesita una pestaña abierta; el MCP remoto funciona sin interfaz visible. Las acciones de autorización y ejecución no se registran en WebMCP todavía para reducir superficie de riesgo.

## Seguridad y límites actuales

- Los estados viven en memoria del proceso. Esto permite el demo y las pruebas, pero no ofrece idempotencia durable entre regiones o reinicios.
- Antes de producción se debe sustituir `InMemoryIntentStore` por Postgres, Redis o D1 con una restricción única sobre `idempotencyKey`.
- El endpoint demo es público. Producción debe implementar OAuth 2.1 y permisos por herramienta.
- La ejecución actual genera un identificador determinista, no una transacción blockchain.
- Nunca se debe introducir una clave privada en este servidor. Privy o la wallet del usuario debe firmar fuera del núcleo.
- Los conectores reales deben verificar liquidación y fulfillment por separado.

## Camino a producción

1. Privy y autenticación de usuario.
2. OAuth para clientes MCP remotos.
3. almacenamiento durable y auditoría append-only.
4. firmador no custodial y Stellar testnet.
5. conector DeFindex y verificación on-chain.
6. reserva IRL y comprobación de entrega.
7. límites por comercio, red, categoría y periodo.
8. rate limiting, revocación, alertas y evals MCP.

## Salud y descubrimiento

- `GET /api/health`
- `GET /.well-known/mcp`
- `GET /api/commerce` devuelve el catálogo demo.
