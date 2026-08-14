import { useCallback, useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import SyncBadge from "@/components/SyncBadge";
import Home from "@/pages/Home";
import About from "@/pages/About";
import { getSyncInfo, triggerSync } from "@/lib/api";
import { APP_VIEW, viewFromHash } from "@/lib/appView";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const SYNC_COOLDOWN_MS = 3 * 60 * 1000;
const SYNC_HEARTBEAT_MS = 60 * 1000;

function nextSyncPollDelay(info) {
  if (!info?.next_sync_at) return SYNC_HEARTBEAT_MS;
  const wait = new Date(info.next_sync_at).getTime() - Date.now();
  if (!Number.isFinite(wait)) return SYNC_HEARTBEAT_MS;
  if (wait <= 0) return 8_000;
  return Math.min(wait + 3_000, SYNC_HEARTBEAT_MS);
}

export default function AppRouter() {
  const [view, setView] = useState(viewFromHash);
  const [syncInfo, setSyncInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const rerunSearchRef = useRef(null);

  useEffect(() => {
    const onHashChange = () => setView(viewFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    let timeoutId;
    let cancelled = false;

    const poll = async () => {
      try {
        const info = await getSyncInfo();
        if (cancelled) return;
        setSyncInfo(info);
        timeoutId = setTimeout(poll, nextSyncPollDelay(info));
      } catch {
        if (!cancelled) timeoutId = setTimeout(poll, SYNC_HEARTBEAT_MS);
      }
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      clearTimeout(timeoutId);
      poll();
    };

    poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const onManualSync = useCallback(async () => {
    if (refreshing || Date.now() < cooldownUntil) return;
    setRefreshing(true);
    try {
      await triggerSync();
      const info = await getSyncInfo();
      setSyncInfo(info);
      setCooldownUntil(Date.now() + SYNC_COOLDOWN_MS);
      toast.success("Synchronisation effectuée");
      rerunSearchRef.current?.();
    } catch {
      toast.error("Synchronisation impossible");
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, cooldownUntil]);

  const registerRerunSearch = useCallback((fn) => {
    rerunSearchRef.current = fn;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen hero-radial">
        <AppHeader
          activeView={view}
          trailing={
            <SyncBadge
              info={syncInfo}
              onRefresh={onManualSync}
              refreshing={refreshing}
              cooldownUntil={cooldownUntil}
            />
          }
        />
        {view === APP_VIEW.ABOUT ? (
          <About />
        ) : (
          <Home syncInfo={syncInfo} registerRerunSearch={registerRerunSearch} />
        )}
      </div>
    </QueryClientProvider>
  );
}
