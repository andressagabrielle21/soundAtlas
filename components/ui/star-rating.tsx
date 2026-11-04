"use client";

import { isStarRating, starRatingOptions } from "./star-rating-values";

const formatRating = new Intl.NumberFormat("pt-BR");

export function StarRating({
  value,
  onChange,
  label = "Avaliação em estrelas",
}: {
  value: number | null;
  onChange: (value: number) => void;
  label?: string;
}) {
  const rating = isStarRating(value) ? value : null;
  const selectedStar = Math.ceil(rating ?? 0);
  const hasHalf = rating !== null && rating !== selectedStar;

  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap gap-1">
        {starRatingOptions.map(([, full]) => (
          <button
            key={full}
            type="button"
            aria-label={`${full} de 5 estrelas`}
            aria-pressed={selectedStar === full}
            onClick={() => onChange(full)}
            className="relative grid size-touch place-items-center rounded-md text-4xl leading-none text-muted"
          >
            <span aria-hidden="true">☆</span>
            <span
              aria-hidden="true"
              className="absolute inset-0 grid place-items-center text-accent"
              style={{
                clipPath: `inset(0 ${100 - Math.min(1, Math.max(0, (rating ?? 0) - full + 1)) * 100}% 0 0)`,
              }}
            >
              ★
            </span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-3">
        <p aria-live="polite" className="text-sm text-muted">
          {rating === null
            ? "Sem nota"
            : `${formatRating.format(rating)} de 5 estrelas`}
        </p>
        <button
          type="button"
          disabled={rating === null}
          aria-pressed={hasHalf}
          onClick={() => onChange(hasHalf ? selectedStar : selectedStar - 0.5)}
          className="min-h-touch rounded-md px-2 text-sm text-accent underline disabled:opacity-50"
        >
          Meia estrela
        </button>
      </div>
    </fieldset>
  );
}
