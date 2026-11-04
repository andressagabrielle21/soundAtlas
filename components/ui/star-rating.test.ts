import { describe, expect, it } from "vitest";
import { isStarRating, starRatingOptions } from "./star-rating-values";

describe("StarRating", () => {
  it("ordena as metades da esquerda para a direita, em ordem de navegação", () => {
    expect(starRatingOptions).toEqual([
      [0.5, 1],
      [1.5, 2],
      [2.5, 3],
      [3.5, 4],
      [4.5, 5],
    ]);
  });

  it("aceita cada opção do seletor", () => {
    expect(starRatingOptions.flat().every(isStarRating)).toBe(true);
  });

  it.each([0, 5.5, 2.25, -0.5, NaN, Infinity, "2.5", null])(
    "rejeita a nota %s",
    (value) => expect(isStarRating(value)).toBe(false),
  );
});
