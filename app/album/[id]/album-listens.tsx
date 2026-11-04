"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import {
  ListenForm,
  type EditableListen,
} from "../../../components/listen-form";
import { Button } from "../../../components/ui/button";
import { Sheet } from "../../../components/ui/sheet";

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "UTC",
});
const ratingFormat = new Intl.NumberFormat("pt-BR");

function DeleteListen({
  id,
  onDeleted,
}: {
  id: string;
  onDeleted: () => void;
}) {
  const [error, remove, pending] = useActionState(async () => {
    try {
      const response = await fetch(`/api/logs?${new URLSearchParams({ id })}`, {
        method: "DELETE",
      });
      if (response.status !== 204) {
        const body = await response.json().catch(() => null);
        return body?.error ?? "Não foi possível excluir a escuta.";
      }
    } catch {
      return "Não foi possível excluir a escuta. Tente novamente.";
    }
    onDeleted();
    return null;
  }, null);

  return (
    <form action={remove}>
      <p className="mb-gutter">Confirma a exclusão desta escuta do diário?</p>
      <Button type="submit" disabled={pending}>
        {pending ? "Excluindo…" : "Confirmar exclusão"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

export function AlbumListens({
  albumId,
  albumPath,
  logs,
  page,
  hasMore,
}: {
  albumId: string;
  albumPath: string;
  logs: EditableListen[] | null;
  page: number;
  hasMore: boolean;
}) {
  const router = useRouter();
  const [selection, setSelection] = useState<{
    log: EditableListen;
    mode: "edit" | "delete";
  }>();
  const [message, setMessage] = useState("");

  function finish(message: string) {
    setSelection(undefined);
    setMessage(message);
    router.refresh();
  }

  return (
    <section aria-labelledby="album-listens" className="mb-panel">
      <h2 id="album-listens" className="text-heading font-semibold">
        Histórico de escutas
      </h2>
      {message && (
        <p role="status" className="mt-2">
          {message}
        </p>
      )}
      {logs === null ? (
        <p role="alert" className="mt-2">
          Não foi possível carregar o histórico de escutas.
        </p>
      ) : logs.length === 0 ? (
        <p className="mt-2 text-muted">
          {page === 1
            ? "Você ainda não registrou escutas deste álbum."
            : "Não há escutas nesta página."}
        </p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {logs.map((log) => (
            <li key={log.id} className="rounded-lg bg-surface p-gutter">
              <p>
                <time dateTime={log.listened_on}>
                  {dateFormat.format(new Date(log.listened_on))}
                </time>
                {" · "}
                {log.rating_at_time === null
                  ? "Sem nota na escuta"
                  : `${ratingFormat.format(log.rating_at_time)} de 5 estrelas`}
                {log.is_relisten && " · Reescuta"}
              </p>
              {log.note && (
                <p className="mt-2 whitespace-pre-wrap text-muted">
                  {log.note}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  aria-haspopup="dialog"
                  onClick={() => setSelection({ log, mode: "edit" })}
                >
                  Editar
                </Button>
                <Button
                  variant="secondary"
                  aria-haspopup="dialog"
                  onClick={() => setSelection({ log, mode: "delete" })}
                >
                  Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {(page > 1 || hasMore) && (
        <nav
          aria-label="Paginação do histórico de escutas"
          className="mt-2 flex gap-3"
        >
          {page > 1 && (
            <Link
              className="inline-flex min-h-touch items-center underline"
              href={page === 2 ? albumPath : `${albumPath}?escutas=${page - 1}`}
            >
              Anterior
            </Link>
          )}
          {hasMore && (
            <Link
              className="inline-flex min-h-touch items-center underline"
              href={`${albumPath}?escutas=${page + 1}`}
            >
              Próxima
            </Link>
          )}
        </nav>
      )}
      <Sheet
        open={Boolean(selection)}
        onOpenChange={() => setSelection(undefined)}
        title={selection?.mode === "edit" ? "Editar escuta" : "Excluir escuta"}
      >
        {selection?.mode === "edit" && (
          <ListenForm
            albumId={albumId}
            log={selection.log}
            onSaved={() => finish("Escuta atualizada.")}
          />
        )}
        {selection?.mode === "delete" && (
          <DeleteListen
            id={selection.log.id}
            onDeleted={() => finish("Escuta excluída.")}
          />
        )}
      </Sheet>
    </section>
  );
}
