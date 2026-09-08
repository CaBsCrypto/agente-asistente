"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useState } from "react";

export default function AcceptancePanel() {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const [otherId, setOtherId] = useState("");
  const [ownMarker, setOwnMarker] = useState("");
  const [otherMarker, setOtherMarker] = useState("");
  const [report, setReport] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    setReport(null);
    try {
      if (!otherId.startsWith("did:privy:") || otherId === user?.id || !ownMarker || !otherMarker || ownMarker === otherMarker) throw new Error("Indica otra identidad y dos marcas distintas.");
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
      setReport({ date: new Date().toISOString(), commit: health.deployment.gitCommitSha, deployment: health.deployment.url, identity: user?.id, checks, scope: "Lectura: el intento de seleccionar otro propietario debe seguir devolviendo solo los datos propios. No prueba mutaciones ni recibos." });
    } catch (error) {
      setReport({ status: "fallido", error: error instanceof Error ? error.message : "No se completó la comprobación." });
    } finally { setBusy(false); }
  }
  return <main className="shell" style={{ padding: "48px 24px" }}>
    <h1>Comprobación de aislamiento de Preview</h1>
    <p>Consultas de lectura con la sesión actual. No crea billeteras, fondos ni pagos.</p>
    <p>Cuenta: {user?.email?.address ?? "Sin sesión"}</p>
    {!authenticated ? <button disabled={!ready} onClick={() => login()}>Iniciar sesión de prueba</button> : <>
      <button disabled={busy} onClick={async () => { await fetch("/api/admin/session", { method: "DELETE" }); await logout(); setReport(null); }}>Cerrar ambas sesiones</button>
      <p><label>Identidad del otro usuario <input value={otherId} onChange={(e) => setOtherId(e.target.value)} /></label></p>
      <p><label>Marca propia <input value={ownMarker} onChange={(e) => setOwnMarker(e.target.value)} /></label></p>
      <p><label>Marca del otro usuario <input value={otherMarker} onChange={(e) => setOtherMarker(e.target.value)} /></label></p>
      <button disabled={busy} onClick={run}>{busy ? "Comprobando…" : "Verificar aislamiento de lectura"}</button>
    </>}
    {report !== null && <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(report, null, 2)}</pre>}
  </main>;
}
