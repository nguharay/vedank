/* The service worker decides what gets served from cache. Getting that wrong
   means every visitor stuck on a stale build, or a signed-in page handed back
   after sign-out — so the policy is tested here rather than trusted.

   sw.js is run against a stub global: no browser needed. */
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

type Handler = (e: FakeEvent) => void;
type FakeEvent = {
  request: { url: string; method: string; mode?: string };
  respondWith: (v: unknown) => void;
  waitUntil: (v: unknown) => void;
};

const store = new Map<string, string>();
const cacheApi = {
  open: async () => ({
    add: async (u: string) => void store.set(u, "precached"),
    put: async (k: unknown, _v: unknown) => void store.set(typeof k === "string" ? k : (k as { url: string }).url, "put"),
    keys: async () => [...store.keys()].map((url) => ({ url })),
  }),
  keys: async () => ["sutra-v1"],
  delete: async () => true,
  match: async (req: unknown) => {
    const url = typeof req === "string" ? req : (req as { url: string }).url;
    const key = url.startsWith("http") ? new URL(url).pathname : url;
    return store.has(key) ? { cached: key } : undefined;
  },
};

const handlers: Record<string, Handler> = {};
let networkUp = true;
const ctx: Record<string, unknown> = {
  self: {
    addEventListener: (k: string, fn: Handler) => void (handlers[k] = fn),
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
    location: { origin: "https://app.test" },
  },
  caches: cacheApi,
  fetch: async () => {
    if (!networkUp) throw new Error("offline");
    return { ok: true, clone: () => ({ body: "copy" }), fromNetwork: true };
  },
  Response: { error: () => ({ isError: true }) },
  URL,
  Promise,
  console,
};
ctx.self = Object.assign(ctx.self as object, { addEventListener: (ctx.self as { addEventListener: Handler }).addEventListener });
vm.createContext(ctx);
vm.runInContext(readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8"), ctx);

const fails: string[] = [];
function check(label: string, cond: boolean) {
  if (!cond) fails.push(label);
}

/* Ask the worker what it would do with a request. `undefined` means "left
   alone" — the browser's own default, which is what bypassing looks like. */
async function handle(url: string, method = "GET", mode = "no-cors") {
  let answered: unknown;
  const e: FakeEvent = {
    request: { url, method, mode },
    respondWith: (v) => void (answered = v),
    waitUntil: () => {},
  };
  handlers.fetch?.(e);
  return answered === undefined ? undefined : await answered;
}

(async () => {
  /* Nothing that writes may ever be served from a cache. */
  check("POST is left alone", (await handle("https://app.test/", "POST", "navigate")) === undefined);
  check("/api is left alone", (await handle("https://app.test/api/health")) === undefined);
  check("race invites are left alone", (await handle("https://app.test/r/abc", "GET", "navigate")) === undefined);
  check("classroom is left alone", (await handle("https://app.test/classroom", "GET", "navigate")) === undefined);
  check("cross-origin is left alone", (await handle("https://fonts.googleapis.com/x")) === undefined);

  /* Build output is immutable, so cache-first is safe and is what makes
     offline play possible at all. */
  const chunk = await handle("https://app.test/_next/static/chunk.js");
  check("static assets are handled", chunk !== undefined);

  /* Pages go to the network first, so a deploy is never held back. */
  networkUp = true;
  const live = (await handle("https://app.test/try", "GET", "navigate")) as { fromNetwork?: boolean };
  check("a page prefers the network", live?.fromNetwork === true);

  /* Offline: the cached guest game, or the offline page. */
  networkUp = false;
  store.set("/try", "cached");
  const off = (await handle("https://app.test/try", "GET", "navigate")) as { cached?: string };
  check("offline serves the cached /try", off?.cached === "/try");

  store.delete("/try");
  store.set("/offline.html", "cached");
  const fallback = (await handle("https://app.test/whatever", "GET", "navigate")) as { cached?: string };
  check("offline falls back to the plain HTML fallback", fallback?.cached === "/offline.html");

  if (fails.length) {
    console.error("service worker policy FAILED:\n  " + fails.join("\n  "));
    process.exit(1);
  }
  console.log("service worker policy holds (9 checks)");
})();
