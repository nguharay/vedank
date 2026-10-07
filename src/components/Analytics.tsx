"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { GA_ID, CLARITY_ID } from "@/lib/analytics";

/* GA4 and Microsoft Clarity. Each loads only when its ID is set in Vercel
   (NEXT_PUBLIC_GA_ID = "G-…", NEXT_PUBLIC_CLARITY_ID = the Clarity project id),
   so without them nothing is loaded at all.

   Pages whose content is personal (sign-in forms, a teacher's roster of
   children, admin lists) are fully masked in Clarity recordings. Elsewhere
   Clarity's default masking already hides whatever is typed into inputs. */
const PRIVATE = ["/login", "/signup", "/forgot-password", "/reset-password", "/classroom", "/admin", "/c/"];

export function Analytics() {
  const path = usePathname() || "/";
  useEffect(() => {
    if (PRIVATE.some((p) => path.startsWith(p))) document.body.setAttribute("data-clarity-mask", "True");
    else document.body.removeAttribute("data-clarity-mask");
  }, [path]);

  return (
    <>
      {GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', '${GA_ID}', { allow_google_signals: false, allow_ad_personalization_signals: false });
          `}</Script>
        </>
      )}
      {CLARITY_ID && (
        <Script id="clarity" strategy="afterInteractive">{`
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_ID}");
        `}</Script>
      )}
    </>
  );
}
