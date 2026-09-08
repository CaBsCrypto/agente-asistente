"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";

export default function AcceptancePanel() {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const [otherId, setOtherId] = useState("");
  const [ownMarker, setOwnMarker] = useState("");
  const [otherMarker, setOtherMarker] = useState("");
  const [otherMemory, setOtherMemory] = useState("");
  const [report, setReport] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    setReport(null);
    try {
      if (!otherId.startsWith("did:privy:") || otherId === user?.id || !ownMarker || !otherMarker || ownMarker === otherMarker) throw new Error("Indica otra identidad y dos marcas distintas.");
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(otherMemory)) throw new Error("Indica el identificador de la memoria ficticia ajena.");
      const health = await fetch("/api/health", { cache: "no-store" }).then((r) => r.json());
      if (health.deployment?.environment !== "preview" || !health.previewIsolation?.verified) throw new Error("Preview aislada no verificada.");
      const token = await getAccessToken();
      if (!token) throw new Error("Sesión ausente.");
      const checks = [];
      for (const path of ["/api/agent/chat", "/api/agent/memory", "/api/agent/wallets"]) {
        const headers = { Authorization: `Bearer ${token}` };
        const baseline = await fetch(path, { headers, cache: "no-store" });
        const baselineBody = await baseline.text();
        const attempted = await fetch(`${path}?userId=${encodeURIComponent(otherId)}&owner=${encodeURIComponent(otherId)}`, { headers, cache: "no-store" });
        const attemptedBody = await attempted.text();
        const ownData = path.endsWith("wallets") || (baselineBody.includes(ownMarker) && attemptedBody.includes(ownMarker));
        const sameWallets = !path.endsWith("wallets") || baselineBody === attemptedBody;
        checks.push({ path, status: baseline.ok && attempted.ok && ownData && sameWallets && !attemptedBody.includes(otherId) && !attemptedBody.includes(otherMarker) ? "aprobado" : "fallido", baselineHttp: baseline.status, attemptedHttp: attempted.status });
      }
      const admin = await fetch("/api/admin/wallets", { cache: "no-store" });
      checks.push({ path: "/api/admin/wallets", status: admin.status === 401 || admin.status === 403 ? "aprobado" : "fallido", baselineHttp: admin.status, attemptedHttp: admin.status });
      if (checks.some((check) => check.status !== "aprobado")) throw new Error("Las consultas no pasaron. No se intentó modificar la memoria ficticia.");
      const rejected = await fetch("/api/agent/memory", {
        method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ record: "knowledge", id: otherMemory, status: "paused" }),
      });
      checks.push({ path: "PATCH /api/agent/memory (ficticia ajena)", status: rejected.status === 404 ? "aprobado" : "fallido", baselineHttp: rejected.status, attemptedHttp: rejected.status });
      setReport({ date: new Date().toISOString(), commit: health.deployment.gitCommitSha, deployment: health.deployment.url, identity: user?.id, checks, scope: "Consultas limitadas al usuario y rechazo de modificación de una memoria ficticia ajena. Verificar además en la base que la memoria no cambió. No prueba recibos ni pagos." });
    } catch (error) {
      setReport({ status: "fallido", error: error instanceof Error ? error.message : "No se completó la comprobación." });
    } finally { setBusy(false); }
  }
  return <main className="shell" style={{ padding: "48px 24px" }}>
    <h1>Comprobación de aislamiento de Preview</h1>
    <p>Consulta datos propios e intenta pausar una memoria ficticia ajena: debe ser rechazado. Las consultas pueden actualizar metadatos de sesión. No crea billeteras, fondos ni pagos.</p>
    <p>Cuenta: {user?.email?.address ?? "Sin sesión"}</p>
    {!authenticated ? <button disabled={!ready} onClick={() => login()}>Iniciar sesión de prueba</button> : <>
      <button disabled={busy} onClick={async () => { await fetch("/api/admin/session", { method: "DELETE" }); await logout(); setReport(null); }}>Cerrar ambas sesiones</button>
      <p><label>Identidad del otro usuario <input value={otherId} onChange={(e) => setOtherId(e.target.value)} /></label></p>
      <p><label>Marca propia <input value={ownMarker} onChange={(e) => setOwnMarker(e.target.value)} /></label></p>
      <p><label>Marca del otro usuario <input value={otherMarker} onChange={(e) => setOtherMarker(e.target.value)} /></label></p>
      <p><label>Memoria ficticia del otro usuario <input value={otherMemory} onChange={(e) => setOtherMemory(e.target.value)} /></label></p>
      <button disabled={busy} onClick={run}>{busy ? "Comprobando…" : "Verificar aislamiento"}</button>
    </>}
    {report !== null && <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(report, null, 2)}</pre>}
  </main>;
}
