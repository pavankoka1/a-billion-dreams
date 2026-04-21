"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export default function ServiceWorkerRegister() {
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const waitingRegistrationRef = useRef(null);
  const updateKeyRef = useRef("");
  const dismissedUpdateKeyRef = useRef("");

  const dismissToast = useCallback(() => {
    dismissedUpdateKeyRef.current = updateKeyRef.current;
    setShowUpdateToast(false);
  }, []);

  const applyUpdate = useCallback(() => {
    const registration = waitingRegistrationRef.current;
    if (!registration?.waiting) {
      setShowUpdateToast(false);
      return;
    }

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    setShowUpdateToast(false);
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let disposed = false;

    const maybePromptUpdate = (registration) => {
      if (!registration?.waiting || disposed) return;
      const key = registration.waiting.scriptURL || "unknown-sw";
      updateKeyRef.current = key;
      waitingRegistrationRef.current = registration;
      if (dismissedUpdateKeyRef.current === key) return;
      setShowUpdateToast(true);
    };

    const bindRegistration = (registration) => {
      if (!registration) return;
      maybePromptUpdate(registration);
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (
            installing.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            maybePromptUpdate(registration);
          }
        });
      });
    };

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          bindRegistration(registration);
          return navigator.serviceWorker.ready;
        })
        .then((readyRegistration) => {
          bindRegistration(readyRegistration);
          readyRegistration.update().catch(() => {});
        })
        .catch(() => {});
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    return () => {
      disposed = true;
      window.removeEventListener("load", register);
    };
  }, []);

  if (!showUpdateToast) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-120">
      <div className="pointer-events-auto w-[min(92vw,360px)] rounded-xl border border-white/12 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-md">
        <p className="text-sm font-medium text-zinc-100">
          New version available
        </p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">
          A fresher build of A Billion Dreams is ready.
        </p>
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={dismissToast}
            className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-white/5"
          >
            Later
          </button>
          <button
            type="button"
            onClick={applyUpdate}
            className="rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-400"
          >
            Update now
          </button>
        </div>
      </div>
    </div>
  );
}
