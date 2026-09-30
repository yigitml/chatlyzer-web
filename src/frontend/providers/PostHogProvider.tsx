"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import { ANALYTICS_EVENTS } from "@/shared/analytics/events";
import { getPublicEnv } from "@/shared/config/env";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const publicEnv = getPublicEnv();

  useEffect(() => {
    const posthogKey = publicEnv.NEXT_PUBLIC_POSTHOG_KEY;

    if (!posthogKey) {
      return;
    }

    posthog.init(posthogKey, {
      api_host: "/ingest",
      ui_host: publicEnv.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com",
      capture_pageview: false,
      capture_pageleave: false,
      autocapture: false,
      disable_session_recording: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      capture_exceptions: false,
      before_send: (event) => {
        if (
          !event ||
          !Object.values(ANALYTICS_EVENTS).includes(event.event as never)
        )
          return null;
        // No DOM text, query strings, referrers, or arbitrary capture properties.
        const distinctId = event.properties?.distinct_id;
        event.properties = { distinct_id: distinctId };
        return event;
      },
      debug: process.env.NODE_ENV === "development",
    });
  }, [publicEnv.NEXT_PUBLIC_POSTHOG_HOST, publicEnv.NEXT_PUBLIC_POSTHOG_KEY]);

  if (!publicEnv.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
