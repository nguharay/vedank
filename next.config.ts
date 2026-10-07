import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  /* One public address: pages on the old vedank.vercel.app move to
     game.vedankacademy.com, so a sign-in on one is never missing on the other.
     Kept out on purpose: /api (the reminder cron and other background calls
     don't follow redirects), /sw.js (browsers refuse a redirected service
     worker) and /_next internals. */
  async redirects() {
    return [
      {
        source: "/:path((?!api/|sw\\.js$|_next/).*)",
        has: [{ type: "host", value: "vedank.vercel.app" }],
        destination: "https://game.vedankacademy.com/:path",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
