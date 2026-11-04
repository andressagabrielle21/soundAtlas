import { createClient } from "../../../lib/supabase/server";
import { exportCsv, type ExportData } from "./csv";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    return Response.json(
      { error: "Entre para exportar seus dados." },
      { status: 401, headers },
    );
  }

  const format = new URL(request.url).searchParams.get("format") ?? "json";
  if (format !== "json" && format !== "csv") {
    return Response.json(
      { error: "Escolha JSON ou CSV." },
      { status: 400, headers },
    );
  }

  const { data, error } = await client.rpc("read_profile_data", {
    export_records: true,
  });
  if (error || !data) {
    return Response.json(
      { error: "Não foi possível exportar seus dados." },
      { status: 500, headers },
    );
  }

  return new Response(
    format === "json"
      ? JSON.stringify(data, null, 2)
      : exportCsv(data as ExportData),
    {
      headers: {
        ...headers,
        "Content-Type":
          format === "json"
            ? "application/json; charset=utf-8"
            : "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="soundatlas.${format}"`,
      },
    },
  );
}
