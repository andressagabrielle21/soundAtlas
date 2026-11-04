"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "../../../lib/supabase/server";

export async function updateLibrary(
  albumId: string,
  path: string,
  _: string | null,
  formData: FormData,
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Entre novamente para atualizar sua biblioteca.";

  const status = formData.get("status");
  const remove = formData.get("intent") === "remove";
  if (
    !remove &&
    status !== "want" &&
    status !== "listening" &&
    status !== "listened"
  ) {
    return "Selecione um status.";
  }

  const { error } = remove
    ? await supabase.rpc("remove_library_album", {
        target_album: albumId,
        remove_logs: formData.get("logs") === "delete",
      })
    : await supabase
        .from("library_entries")
        .upsert(
          { user_id: user.id, album_id: albumId, status },
          { onConflict: "user_id,album_id" },
        );

  if (error)
    return "Não foi possível atualizar sua biblioteca. Tente novamente.";

  revalidatePath(path);
  revalidatePath("/biblioteca");
  return null;
}
