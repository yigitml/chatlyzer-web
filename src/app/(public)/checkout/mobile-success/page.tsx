"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";

const DEFAULT_MOBILE_REDIRECT = "chatlyzer://checkout/success";

export default function MobileCheckoutSuccessPage() {
  const searchParams = useSearchParams();

  const redirectUrl = useMemo(() => {
    const redirectTarget = searchParams.get("redirect") || DEFAULT_MOBILE_REDIRECT;
    const forwardedParams = new URLSearchParams(searchParams.toString());
    forwardedParams.delete("redirect");

    const query = forwardedParams.toString();
    if (!query) {
      return redirectTarget;
    }

    return `${redirectTarget}${redirectTarget.includes("?") ? "&" : "?"}${query}`;
  }, [searchParams]);

  useEffect(() => {
    window.location.replace(redirectUrl);
  }, [redirectUrl]);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-3xl font-extrabold font-display">Returning to Chatlyzer</h1>
        <p className="text-white/70">
          If the app does not open automatically, tap the button below.
        </p>
        <a
          href={redirectUrl}
          className="inline-flex items-center justify-center rounded-full bg-white text-black px-6 py-3 font-bold"
        >
          Open Chatlyzer
        </a>
      </div>
    </main>
  );
}
