import { useEffect, useState } from "react";
import {
  clearNexusCoreStagingSession,
  readNexusCoreStagingSession,
  writeNexusCoreStagingSession,
  type NexusCoreStagingSession,
} from "@/lib/nexus-core-staging-session";

export function NexusCoreStagingManagerLogin() {
  const [claimCode, setClaimCode] = useState("");
  const [session, setSession] = useState<NexusCoreStagingSession | null>(() => readNexusCoreStagingSession());
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Paste Joanna's one-time staging claim to activate manager authority.");

  useEffect(() => {
    const sync = () => setSession(readNexusCoreStagingSession());
    window.addEventListener("nexus:core-staging-session-change", sync);
    return () => window.removeEventListener("nexus:core-staging-session-change", sync);
  }, []);

  const login = async () => {
    const code = claimCode.trim();
    if (code.length < 32 || code.length > 200) {
      setStatus("Enter a valid one-time staging claim.");
      return;
    }
    setClaimCode("");
    setBusy(true);
    setStatus("Creating bounded non-production manager session…");
    try {
      const response = await fetch("/api/nexus/core/staging-device-login", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ claimCode: code }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setStatus(payload?.message || payload?.error || `Staging login rejected (${response.status}).`);
        return;
      }
      if (
        payload?.authentication !== "STAGING_DEVICE_CLAIM" ||
        typeof payload?.token !== "string" ||
        typeof payload?.personId !== "string" ||
        typeof payload?.displayName !== "string" ||
        typeof payload?.expiresAt !== "string"
      ) {
        setStatus("Unexpected staging login response. No session retained.");
        return;
      }
      const next: NexusCoreStagingSession = {
        token: payload.token,
        personId: payload.personId,
        displayName: payload.displayName,
        expiresAt: payload.expiresAt,
      };
      writeNexusCoreStagingSession(next);
      setSession(next);
      setStatus(`Manager session ACTIVE · ${next.displayName}`);
    } catch {
      setStatus("Staging device login API is unavailable.");
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    clearNexusCoreStagingSession();
    setSession(null);
    setStatus("Manager staging session cleared from this browser tab.");
  };

  return (
    <aside
      data-control
      className="fixed left-3 top-3 z-[155] w-[min(370px,calc(100vw-24px))] rounded-xl border border-cyan-300/35 bg-slate-950/94 p-3 text-slate-100 shadow-xl backdrop-blur"
      aria-label="Nexus Core non-production manager login"
    >
      <div className="text-[10px] font-black uppercase tracking-[.15em] text-cyan-200">NON-PRODUCTION MANAGER</div>
      <div className="mt-1 text-[10px] text-slate-400">{status}</div>
      {session ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="text-[10px] text-emerald-200">
            {session.displayName} · expires {new Date(session.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-slate-500/50 bg-slate-900 px-2 py-1 text-[10px] font-bold"
          >
            Clear
          </button>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <input
            type="password"
            autoComplete="off"
            value={claimCode}
            onChange={(event) => setClaimCode(event.target.value)}
            placeholder="Joanna one-time claim"
            className="min-w-0 flex-1 rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 outline-none"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void login()}
            className="rounded-md bg-cyan-700 px-2 py-1 text-[10px] font-black text-white disabled:opacity-50"
          >
            ACTIVATE
          </button>
        </div>
      )}
      <div className="mt-2 text-[9px] text-slate-500">
        Session token is kept only in this browser tab (sessionStorage). Claim is consumed server-side and never stored by this UI.
      </div>
    </aside>
  );
}
