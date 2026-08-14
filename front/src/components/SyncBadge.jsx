import { Info, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function timeAgo(iso) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `il y a ${d}j`;
}

function SncfDataInfo() {
  return (
    <div
      className="group relative inline-flex"
      data-testid="sncf-data-info-wrap"
    >
      <span
        tabIndex={0}
        className="p-0.5 rounded-full text-slate-400 transition-colors group-hover:text-slate-600 group-hover:bg-slate-200/80 group-focus-within:text-slate-600 group-focus-within:bg-slate-200/80 cursor-help outline-none"
        aria-describedby="sncf-data-info-panel"
        data-testid="sncf-data-info-btn"
      >
        <Info className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      </span>
      <div
        id="sncf-data-info-panel"
        role="tooltip"
        data-testid="sncf-data-info-panel"
        className="pointer-events-none absolute right-0 top-full z-50 mt-1 w-[min(19rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 text-left text-[11px] leading-relaxed text-slate-600 shadow-lg opacity-0 invisible translate-y-0.5 transition-all duration-150 before:absolute before:inset-x-0 before:-top-2 before:h-2 before:content-[''] group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:pointer-events-auto"
      >
        <p className="font-semibold text-slate-800 text-xs mb-3">
          Rafraîchissement des données SNCF
        </p>
        <div className="space-y-2.5">
          <p>
            Les disponibilités proviennent du jeu de données ouvert{" "}
            <span className="text-slate-800">« Disponibilités TGV Max »</span> sur data.sncf.com,
            publié par SNCF Voyageurs.
          </p>
          <p>
            La SNCF le met à jour{" "}
            <strong className="font-medium text-slate-700">chaque jour en début de matinée</strong>.<br/>
            Ce n’est pas du temps réel : c’est un instantané des places MAX encore éligibles à la réservation.
          </p>
          <p className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2 text-slate-600">
            <span className="font-medium text-slate-700">SNCF Connect</span> s’appuie sur des ressources
            privées et externes (stock et tarifs en temps réel).{" "}
            <span className="font-medium text-slate-700"><br/><br/>MaxTracker</span>, lui, utilise uniquement ce flux
            <strong className="font-medium text-slate-700"> public et gratuit</strong> : des écarts avec SNCF Connect
            sont donc possibles.
          </p>
          <ul className="space-y-2 list-none border-t border-slate-100 pt-2.5">
            <li>
              <span className="font-medium text-slate-700">Données SNCF</span>
              <span className="block mt-0.5 text-slate-500">Mise à jour effectuée par la SNCF.</span>
            </li>
            <li>
              <span className="font-medium text-slate-700">Dernière sync</span>
              <span className="block mt-0.5 text-slate-500">
                Dernier contrôle MaxTracker (toutes les 15 min), même si la SNCF n’a rien publié.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function cooldownTitle(remainingMs) {
  const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m <= 0) return `Réessayez dans ${s} s`;
  return `Réessayez dans ${m} min ${String(s).padStart(2, "0")} s`;
}

export default function SyncBadge({ info, onRefresh, refreshing, cooldownUntil = 0 }) {
  const [, force] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobilePanelRef = useRef(null);
  const remainingMs = Math.max(0, cooldownUntil - Date.now());
  const onCooldown = remainingMs > 0;
  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), onCooldown ? 1000 : 30000);
    return () => clearInterval(id);
  }, [onCooldown]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onPointerDown = (event) => {
      if (mobilePanelRef.current && !mobilePanelRef.current.contains(event.target)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [mobileOpen]);
  const ok = info?.last_sync_status === "ok" || info?.last_sync_status === "skipped";
  const lastCheckAt = info?.last_attempt_at || info?.last_sync_at;

  return (
    <div className="relative flex items-center gap-1.5 sm:gap-3 min-w-0" data-testid="sync-badge" ref={mobilePanelRef}>
      <div className="hidden md:block text-[11px] leading-tight text-right" data-testid="sncf-update-status">
        <div className="flex items-center justify-end gap-1">
          <span className="font-semibold text-slate-600">Données SNCF</span>
          <SncfDataInfo />
        </div>
        <div className="text-slate-500 font-mono">{timeAgo(info?.sncf_data_updated_at)}</div>
      </div>

      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 hover:bg-slate-50 transition-colors"
        aria-label="Afficher les détails de synchronisation"
        aria-expanded={mobileOpen}
        data-testid="sync-status-toggle"
      >
        {ok ? <Wifi className="h-3.5 w-3.5 text-emerald-600" /> : <WifiOff className="h-3.5 w-3.5 text-amber-600" />}
        <div className="hidden sm:block text-[11px] leading-tight">
          <div className="font-semibold text-slate-700">Dernière sync</div>
          <div className="text-slate-500 font-mono">{timeAgo(lastCheckAt)}</div>
        </div>
      </button>

      {mobileOpen && (
        <div
          className="md:hidden absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-[11px] leading-tight z-50"
          data-testid="sync-status-panel-mobile"
        >
          <div className="mb-2">
            <div className="font-semibold text-slate-700">Données SNCF</div>
            <div className="text-slate-500 font-mono">{timeAgo(info?.sncf_data_updated_at)}</div>
          </div>
          <div>
            <div className="font-semibold text-slate-700">Dernière sync</div>
            <div className="text-slate-500 font-mono">{timeAgo(lastCheckAt)}</div>
          </div>
        </div>
      )}

      <button
        onClick={onRefresh}
        disabled={refreshing || onCooldown}
        data-testid="manual-refresh-btn"
        className="p-2 rounded-full hover:bg-slate-100 transition-colors disabled:opacity-50"
        title={
          refreshing
            ? "Synchronisation en cours"
            : onCooldown
              ? cooldownTitle(remainingMs)
              : "Rafraîchir maintenant"
        }
      >
        <RefreshCw className={`h-4 w-4 text-slate-600 ${refreshing ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}
