"use server";

import { redirect } from "next/navigation";
import {
  CatalogConfigurationError,
  readAlbum,
  saveAlbum,
} from "../../lib/catalog/albums";
import { isReleaseGroupId } from "../../lib/musicbrainz/cover";
import { searchAlbums } from "../../lib/musicbrainz/search";
import { createClient } from "../../lib/supabase/server";

export async function openAlbum(
  query: string,
  id: string,
  registerListen: boolean,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) redirect("/entrar");

  if (
    typeof query !== "string" ||
    query.length > 200 ||
    typeof id !== "string" ||
    !isReleaseGroupId(id)
  ) {
    redirect("/buscar");
  }

  try {
    if (!(await readAlbum(id))) {
      const results = await searchAlbums(query);
      const album = results.find((result) => result.externalId === id);
      if (!album) throw new Error("Álbum ausente dos resultados.");
      await saveAlbum(album);
    }
  } catch (cause) {
    const configurationFailed = cause instanceof CatalogConfigurationError;
    console.error("Falha ao abrir álbum", {
      albumId: id,
      reason: configurationFailed ? "catalog_configuration" : "catalog_open",
      code:
        typeof cause === "object" && cause !== null && "code" in cause
          ? cause.code
          : undefined,
    });
    redirect(
      `/buscar?${new URLSearchParams({ q: query, erro: configurationFailed ? "catalogo" : "album", ...(registerListen && { registrar: "1" }) })}`,
    );
  }

  redirect(`/album/${id}${registerListen ? "?registrar=1" : ""}`);
}
