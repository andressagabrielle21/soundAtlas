import { expect, it } from "vitest";
import { exportCsv } from "./csv";

it("preserva meias estrelas, vírgulas, aspas, linhas e reescutas", () => {
  const csv = exportCsv({
    library: [
      { external_id: "a", rating: 4.5, review: 'Ótimo, "sim"\nOutra linha' },
    ],
    diary: [{ external_id: "a", rating_at_time: 3.5, is_relisten: false }],
  });
  const [header, ...rows] = csv.split("\r\n");
  const columns = header.split(",");
  expect(rows[0].split(",")[columns.indexOf("rating")]).toBe("4.5");
  expect(rows[0]).toContain('"Ótimo, ""sim""\nOutra linha"');
  expect(rows[1].split(",")[columns.indexOf("rating_at_time")]).toBe("3.5");
  expect(rows[1].split(",")[columns.indexOf("is_relisten")]).toBe("false");
});
