type Cell = string | number | boolean | null;
export type ExportData = {
  library: Record<string, Cell>[];
  diary: Record<string, Cell>[];
};

const columns = [
  "type",
  "id",
  "album_id",
  "external_id",
  "title",
  "artist",
  "release_year",
  "status",
  "rating",
  "rating_at_time",
  "listened_on",
  "is_relisten",
  "review",
  "note",
  "created_at",
  "updated_at",
] as const;

function encodeCell(value: Cell | undefined) {
  if (value == null) return "";
  if (typeof value !== "string") return String(value);
  // Keep spreadsheet apps from interpreting user text as a formula.
  const text = /^[\s]*[=+@-]|^[\t\r\n]/.test(value) ? "'" + value : value;
  return '"' + text.replaceAll('"', '""') + '"';
}

export function exportCsv({ library, diary }: ExportData) {
  const rows = [
    ...library.map((row) => ({ ...row, type: "library" })),
    ...diary.map((row) => ({ ...row, type: "diary" })),
  ] satisfies Record<string, Cell>[];
  return [
    columns.join(","),
    ...rows.map((row: Record<string, Cell>) =>
      columns.map((column) => encodeCell(row[column])).join(","),
    ),
  ].join("\r\n");
}
