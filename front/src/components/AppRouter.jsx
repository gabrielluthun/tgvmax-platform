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
    getSyncInfo().then(setSyncInfo).catch(() => {});
    const id = setInterval(() => getSyncInfo().then(setSyncInfo).catch(() => {}), 60000);
    return () => clearInterval(id);
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
