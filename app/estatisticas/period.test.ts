import { describe, expect, it } from "vitest";
import { getStatsPeriod } from "./period";

describe("período das estatísticas", () => {
  const now = new Date("2026-01-03T01:00:00Z");

  it.each([
    ["7", "2025-12-27"],
    ["30", "2025-12-04"],
    ["ano", "2026-01-01"],
    ["inválido", "2025-12-04"],
  ])("calcula o início inclusivo para %s", (period, start_on) => {
    expect(getStatsPeriod(period, now).bounds).toEqual({
      start_on,
      end_on: "2026-01-02",
    });
  });

  it("omite os limites para todo o histórico", () => {
    expect(getStatsPeriod("tudo", now).bounds).toEqual({});
  });
});
