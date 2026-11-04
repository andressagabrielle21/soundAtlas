export function RatingStars({ rating }: { rating: number }) {
  return (
    <span
      aria-hidden="true"
      className="relative inline-block whitespace-nowrap leading-none text-muted"
    >
      ☆☆☆☆☆
      <span
        className="absolute inset-0 text-accent"
        style={{ clipPath: `inset(0 ${100 - rating * 20}% 0 0)` }}
      >
        ★★★★★
      </span>
    </span>
  );
}
