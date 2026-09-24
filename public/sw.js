/* Offline support, hand-written rather than pulled from a library: the whole
   policy is forty lines and the failure mode of getting it wrong — a stale
   page served forever to every visitor — is bad enough to want it readable.

   The promise is deliberately narrow. /try is playable offline because guest
   progress lives in localStorage and needs no server. The signed-in app is
   not made to work offline, because its progress, races and leagues all do.
   An offline visitor is offered the guest game instead, and what they play
   there merges into their account the next time they sign in.

   Bump VERSION to retire every old cache on the next activate. */
const VERSION = "v2";
const CACHE = `sutra-${VERSION}`;

/* /offline.html is a plain file with inline styles and no script: a fallback
   that needs the framework to boot is not a fallback — as a React page it
   rendered offline as raw flight data behind "This page couldn't load".
   /try does need its chunks, and those are picked up by the runtime cache on
   the first online visit, so offline play works from the second visit on. */
const PRECACHE = ["/offline.html", "/try", "/manifest.webmanifest", "/brand/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      /* One at a time: a single 404 would reject addAll and leave the worker
         installed with nothing cached. */
      .then((c) => Promise.allSettled(PRECACHE.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Anything that reads or writes real state has to reach the network; serving
   a cached answer for these would be worse than failing. */
function bypass(url) {
  return (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/data") ||
    url.pathname.startsWith("/r/") ||        /* race invites resolve server-side */
    url.pathname === "/admin" ||
    url.pathname === "/classroom"
  );
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;                       /* never a server action */
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        /* fonts, CDNs: leave alone */
  if (bypass(url)) return;

  /* Immutable build output and brand art: cache-first, and fill the cache as
     it is asked for. This is what makes /try work on the second visit. */
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/brand/")) {
    e.respondWith(
      caches.match(req).then((hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
      )
    );
    return;
  }

  /* Pages: network first, so a deploy is picked up the moment you are online
     and nobody is stuck on yesterday's build. Only /try is kept — caching a
     signed-in page would mean serving it back after a sign-out. */
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && url.pathname === "/try") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("/try", copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match("/offline.html")) || Response.error())
    );
  }
});

/* ---------- push ----------
   The payload is written by src/lib/game/push.ts. A push with no readable
   body still shows something rather than the browser's own "This site has
   been updated in the background" placeholder. */
self.addEventListener("push", (e) => {
  let note = { title: "インド式算数ゲーム", body: "新しいお知らせがあります", url: "/", tag: "general" };
  try {
    if (e.data) note = Object.assign(note, e.data.json());
  } catch {}
  e.waitUntil(
    self.registration.showNotification(note.title, {
      body: note.body,
      tag: note.tag,
      icon: "/brand/icon-192.png",
      badge: "/brand/icon-192.png",
      data: { url: note.url || "/" },
    })
  );
});

/* Focus a tab that is already open on the app rather than piling up new
   ones; only open a window when there is nothing to focus. */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin && "focus" in w) {
          w.navigate(target).catch(() => {});
          return w.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
