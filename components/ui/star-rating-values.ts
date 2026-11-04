export function isStarRating(value: unknown): value is number {
  return (
    typeof value === "number" &&
    value >= 0.5 &&
    value <= 5 &&
    Number.isInteger(value * 2)
  );
}

export const starRatingOptions = Array.from({ length: 5 }, (_, index) => [
  index + 0.5,
  index + 1,
]);
