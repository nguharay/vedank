"use client";

import { useEffect, useSyncExternalStore } from "react";

/* Online/offline is an external store, not component state — subscribing to
   it directly avoids a mount-time setState and gives the server a defined
   snapshot (assume online, so the strip never flashes during hydration). */
function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/* Registers the worker and shows a quiet strip while the network is down, so
   a player who suddenly cannot reach a race knows why. Nothing here blocks
   the app: a browser without service workers simply never registers one. */
export function ServiceWorkerRegistrar() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  );

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    /* After load, so registration never competes with the first paint. */
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  if (online) return null;
  return (
    <div className="offline-strip" role="status">
      オフライン · offline — おためしモードなら遊べます
    </div>
  );
}
