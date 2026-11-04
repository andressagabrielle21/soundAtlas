import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { isStarRating } from "../../../components/ui/star-rating-values";
import {
  addListen,
  editListen,
  removeListen,
  type AlbumDiary,
} from "../../../lib/listening/diary";
import { createClient } from "../../../lib/supabase/server";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const columns =
  "id,album_id,listened_on,rating_at_time,note,is_relisten,created_at";
const failure = (error: string, status: number) =>
  Response.json({ error }, { status });

function validDate(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value.startsWith("0000")
  )
    return false;
  const date = new Date(value);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

async function session() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  return { client, user };
}

export async function GET(request: Request) {
  const { client, user } = await session();
  if (!user) return failure("Entre para acessar seu diário.", 401);
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  const album = params.get("album_id");
  if ((id !== null && !uuid.test(id)) || (album !== null && !uuid.test(album)))
    return failure("Identificador inválido.", 400);

  let query = client.from("listen_logs").select(columns).eq("user_id", user.id);
  if (album) query = query.eq("album_id", album);
  if (id) {
    const { data, error } = await query.eq("id", id).maybeSingle();
    if (error) return failure("Não foi possível carregar a escuta.", 500);
    return data ? Response.json(data) : failure("Escuta não encontrada.", 404);
  }

  const offset = Number(params.get("offset") ?? 0);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 2147483547)
    return failure("Deslocamento inválido.", 400);
  const { data, error } = await query
    .order("listened_on", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id")
    .range(offset, offset + 99);
  return error
    ? failure("Não foi possível carregar o diário.", 500)
    : Response.json(data);
}

async function mutate(
  request: Request,
  operation: "insert" | "update" | "delete",
) {
  const { client, user } = await session();
  if (!user) return failure("Entre para atualizar seu diário.", 401);

  const raw: unknown =
    operation === "delete"
      ? { id: new URL(request.url).searchParams.get("id") }
      : await request.json().catch(() => null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return failure("Dados inválidos.", 400);
  const { id, album_id, listened_on, rating_at_time, note, is_relisten } =
    raw as Record<string, unknown>;
  const key = operation === "insert" ? album_id : id;
  if (typeof key !== "string" || !uuid.test(key))
    return failure("Identificador inválido.", 400);
  if (
    (operation === "insert" || listened_on !== undefined) &&
    !validDate(listened_on)
  )
    return failure("Informe uma data válida no formato AAAA-MM-DD.", 400);
  if (rating_at_time != null && !isStarRating(rating_at_time))
    return failure("Informe uma nota de 0,5 a 5 em passos de 0,5.", 400);
  if (note != null && (typeof note !== "string" || note.includes("\u0000")))
    return failure("Comentário inválido.", 400);
  if (is_relisten !== undefined && typeof is_relisten !== "boolean")
    return failure("Informe um valor booleano para reescuta.", 400);

  const logId = operation === "insert" ? randomUUID() : key.toLowerCase();
  let albumId = key;
  if (operation !== "insert") {
    const { data, error } = await client
      .from("listen_logs")
      .select("album_id")
      .eq("user_id", user.id)
      .eq("id", logId)
      .maybeSingle();
    if (error) return failure("Não foi possível carregar a escuta.", 500);
    if (!data) return failure("Escuta não encontrada.", 404);
    albumId = data.album_id;
  }

  const { data: album, error: albumError } = await client
    .from("albums")
    .select("external_id")
    .eq("id", albumId)
    .maybeSingle();
  if (albumError) {
    console.error("Falha ao localizar álbum para o diário", {
      code: albumError.code,
    });
    return failure("Não foi possível carregar o álbum.", 500);
  }
  if (!album) return failure("Álbum não encontrado.", 404);

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error: readError } = await client.rpc("read_album_diary", {
      target_album: albumId,
    });
    if (readError) {
      console.error("Falha em read_album_diary", { code: readError.code });
      return failure("Não foi possível carregar o diário.", 500);
    }
    const diary = data as AlbumDiary;
    if (operation !== "insert" && !diary.logs.some((log) => log.id === logId))
      return failure("Escuta não encontrada.", 404);

    const changes = {
      ...(typeof listened_on === "string" && { listened_on }),
      ...(rating_at_time !== undefined && { rating_at_time }),
      ...(note !== undefined && { note }),
      ...(is_relisten !== undefined && { is_relisten }),
    };
    const next =
      operation === "insert"
        ? addListen(diary, {
            id: logId,
            listened_on: listened_on as string,
            rating_at_time: rating_at_time ?? null,
            note: note ?? null,
            is_relisten,
          })
        : operation === "update"
          ? editListen(diary, logId, changes)
          : removeListen(diary, logId);
    const log = next.logs.find((item) => item.id === logId);
    const { error } = await client.rpc("write_album_diary", {
      target_album: albumId,
      target_log: logId,
      operation,
      expected: diary,
      log_data: log ?? null,
      next_entry: next.entry,
    });
    if (error?.code === "40001") continue;
    if (error?.code === "P0002") return failure("Escuta não encontrada.", 404);
    if (error) {
      console.error("Falha em write_album_diary", {
        code: error.code,
        operation,
      });
      return failure("Não foi possível salvar a alteração no diário.", 500);
    }

    revalidatePath("/perfil");
    revalidatePath("/biblioteca");
    revalidatePath(`/album/${album.external_id}`);
    return operation === "delete"
      ? new Response(null, { status: 204 })
      : Response.json(
          { ...log, album_id: albumId },
          { status: operation === "insert" ? 201 : 200 },
        );
  }

  return failure("O diário foi alterado. Tente novamente.", 409);
}

export async function POST(request: Request) {
  return mutate(request, "insert");
}
export async function PATCH(request: Request) {
  return mutate(request, "update");
}
export async function DELETE(request: Request) {
  return mutate(request, "delete");
}
