"use client";

import { useActionState, useState } from "react";
import { Button } from "./ui/button";
import { StarRating } from "./ui/star-rating";

export type EditableListen = {
  id: string;
  listened_on: string;
  rating_at_time: number | null;
  note: string | null;
  is_relisten: boolean | null;
};

export function ListenForm({
  albumId,
  hasPrevious = false,
  log,
  onSaved,
}: {
  albumId: string;
  hasPrevious?: boolean;
  log?: EditableListen;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(() => {
    if (log) return log.listened_on;
    const now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
  });
  const [rating, setRating] = useState<number | null>(
    log?.rating_at_time ?? null,
  );
  const [note, setNote] = useState(log?.note ?? "");
  const [relisten, setRelisten] = useState(log?.is_relisten ?? hasPrevious);
  const [error, submit, pending] = useActionState(async () => {
    try {
      const response = await fetch("/api/logs", {
        method: log ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(log ? { id: log.id } : { album_id: albumId }),
          listened_on: date,
          rating_at_time: rating,
          note: note.trim() || null,
          is_relisten: relisten,
        }),
      });
      if (response.status !== (log ? 200 : 201)) {
        const body = await response.json().catch(() => null);
        return (
          body?.error ?? "Não foi possível salvar a escuta. Tente novamente."
        );
      }
    } catch {
      return "Não foi possível salvar a escuta. Tente novamente.";
    }
    onSaved();
    return null;
  }, null);

  return (
    <form action={submit}>
      <fieldset disabled={pending} className="grid min-w-0 gap-3">
        <label className="grid gap-1">
          Data da escuta
          <input
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="min-h-touch w-full min-w-0 rounded-lg bg-control px-2"
          />
        </label>
        <StarRating value={rating} onChange={setRating} />
        {log && rating !== null && (
          <Button variant="secondary" onClick={() => setRating(null)}>
            Remover nota da escuta
          </Button>
        )}
        <label className="grid gap-1">
          Comentário (opcional)
          <textarea
            rows={2}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="w-full rounded-lg bg-control p-2"
          />
        </label>
        <label className="flex min-h-touch items-center gap-2">
          <input
            type="checkbox"
            checked={relisten}
            onChange={(event) => setRelisten(event.target.checked)}
          />
          Reescuta
        </label>
        <Button type="submit">
          {pending
            ? "Salvando…"
            : log
              ? "Salvar alterações"
              : "Registrar escuta"}
        </Button>
      </fieldset>
      {error && (
        <p role="alert" className="mt-2 text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
