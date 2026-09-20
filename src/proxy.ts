import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PUBLIC_PATHS = ["/login", "/signup"];

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p);
  const isAuthed = !!req.auth;

  if (!isAuthed && !isPublic) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  if (isAuthed && isPublic) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
  return NextResponse.next();
});

// Next.js still reads the matcher from an export literally named `config`
// (verified against the installed next@16.3.5 build analysis code) — despite
// the file being named proxy.ts and the handler being named `proxy`.
// Keep this list explicit rather than a negative-lookahead pattern —
// simpler to reason about, and avoids the whole app matching by accident.
export const config = {
  matcher: ["/", "/login", "/signup"],
};
