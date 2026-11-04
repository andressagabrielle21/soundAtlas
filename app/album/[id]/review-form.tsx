"use client";

import { useActionState, useState } from "react";
import { Button } from "../../../components/ui/button";
import { StarRating } from "../../../components/ui/star-rating";
import type { saveReview } from "./review-actions";
import { REVIEW_MAX_LENGTH } from "./review-limits";

export function ReviewForm({
  rating,
  review,
  action,
}: {
  rating: number | null;
  review: string | null;
  action: (
    state: Awaited<ReturnType<typeof saveReview>> | null,
    form: FormData,
  ) => ReturnType<typeof saveReview>;
}) {
  const [draftRating, setRating] = useState(rating);
  const [previousRating, setPreviousRating] = useState(rating);
  if (previousRating !== rating) {
    setPreviousRating(rating);
    setRating(rating);
  }
  const [draftReview, setReview] = useState(review ?? "");
  const [result, submit, pending] = useActionState(action, null);

  return (
    <section aria-labelledby="album-review" className="mb-panel">
      <h2 id="album-review" className="text-heading font-semibold">
        Nota e resenha
      </h2>
      <form action={submit} className="mt-2">
        <fieldset disabled={pending} className="grid min-w-0 gap-2">
          <StarRating value={draftRating} onChange={setRating} />
          <input type="hidden" name="rating" value={draftRating ?? ""} />
          <label htmlFor="review">Resenha</label>
          <textarea
            id="review"
            name="review"
            rows={4}
            value={draftReview}
            onChange={(event) => setReview(event.target.value)}
            maxLength={REVIEW_MAX_LENGTH}
            aria-describedby="review-count"
            className="w-full rounded-lg border border-outline bg-surface p-3"
          />
          <p id="review-count" className="text-sm text-muted">
            {draftReview.length.toLocaleString("pt-BR")} / 5.000 caracteres
          </p>
          <Button type="submit" className="justify-self-start">
            Salvar avaliação
          </Button>
        </fieldset>
      </form>
      {pending && <p role="status">Salvando avaliação…</p>}
      {!pending &&
        result &&
        (result.error ? (
          <p role="alert">{result.error}</p>
        ) : (
          <p role="status">Avaliação salva.</p>
        ))}
    </section>
  );
}
