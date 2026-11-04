export const periods = {
  "7": "7 dias",
  "30": "30 dias",
  ano: "Ano",
  tudo: "Tudo",
} as const;

export function getStatsPeriod(value: unknown, now = new Date()) {
  const period =
    value === "7" || value === "ano" || value === "tudo" ? value : "30";
  if (period === "tudo") return { period, bounds: {} };

  const end_on = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Recife",
  }).format(now);
  const start = new Date(end_on);
  if (period === "ano") {
    start.setUTCMonth(0, 1);
  } else {
    start.setUTCDate(start.getUTCDate() - (Number(period) - 1));
  }

  return {
    period,
    bounds: { start_on: start.toISOString().slice(0, 10), end_on },
  };
}
