"use client";

import { useEffect } from "react";

/** Registers the service worker (production only) so NutriGoal can be installed on phones. */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
