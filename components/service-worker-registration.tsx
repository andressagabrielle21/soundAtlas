"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      void navigator.serviceWorker
        .register("/sw.js")
        .catch((error: unknown) => {
          console.error("Não foi possível registrar o serviço offline.", error);
        });
    }
  }, []);

  return null;
}
