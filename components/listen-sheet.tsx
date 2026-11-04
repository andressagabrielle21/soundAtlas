"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LoadingSpinner } from "./ui/loading-spinner";
import { Button } from "./ui/button";
import { Sheet } from "./ui/sheet";
import { ListenForm } from "./listen-form";

type History = { hasPrevious: boolean } | { error: string };

export function ListenSheet({
  albumId,
  title,
  openOnLoad,
  children,
}: {
  albumId: string;
  title: string;
  openOnLoad: boolean;
  children?: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(openOnLoad);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<History>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();

    async function loadHistory() {
      try {
        const response = await fetch(
          `/api/logs?${new URLSearchParams({ album_id: albumId })}`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );
        if (!response.ok || response.redirected) throw new Error();
        const logs: unknown = await response.json();
        if (!Array.isArray(logs)) throw new Error();
        if (!controller.signal.aborted)
          setHistory({ hasPrevious: logs.length > 0 });
      } catch {
        if (!controller.signal.aborted) {
          setHistory({
            error: "Não foi possível consultar as escutas anteriores.",
          });
        }
      }
    }

    void loadHistory();
    return () => controller.abort();
  }, [albumId, open, attempt]);

  function close() {
    setOpen(false);
    if (openOnLoad) {
      const url = new URL(window.location.href);
      url.searchParams.delete("registrar");
      window.history.replaceState(null, "", url);
    }
  }

  return (
    <div className="shrink-0">
      <Button
        onClick={() => {
          setHistory(undefined);
          setSaved(false);
          setOpen(true);
        }}
        variant="secondary"
        className="size-touch p-0"
        aria-label="Registrar escuta"
        aria-haspopup="dialog"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          className="size-6"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </Button>
      {saved && (
        <p role="status" className="mt-2">
          Escuta registrada.
        </p>
      )}
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
        title="Registrar escuta"
      >
        {open && (
          <>
            <p className="mb-gutter font-semibold">{title}</p>
            {!history ? (
              <LoadingSpinner />
            ) : "error" in history ? (
              <>
                <p role="alert">{history.error}</p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setHistory(undefined);
                    setAttempt((value) => value + 1);
                  }}
                >
                  Tentar novamente
                </Button>
              </>
            ) : (
              <ListenForm
                albumId={albumId}
                hasPrevious={history.hasPrevious}
                onSaved={() => {
                  close();
                  setSaved(true);
                  router.refresh();
                }}
              />
            )}
            {children}
          </>
        )}
      </Sheet>
    </div>
  );
}
