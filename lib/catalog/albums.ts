import "server-only";

import { createClient as createDatabaseClient } from "@supabase/supabase-js";
import { coverUrl, fetchCover } from "../musicbrainz/cover";
import type { Album } from "../musicbrainz/search";
import { getSupabaseEnv } from "../supabase/env";
import { createClient } from "../supabase/server";

export async function readAlbum(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("albums")
    .select(
      "id,external_id,title,release_year,cover_url,genres,artist:artists(name)",
    )
    .eq("external_id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export class CatalogConfigurationError extends Error {}

export async function saveAlbum(album: Album) {
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!secretKey || secretKey === "sb_secret_your_key") {
    throw new CatalogConfigurationError("Configure SUPABASE_SECRET_KEY.");
  }

  const db = createDatabaseClient(getSupabaseEnv().url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let artistId: string | null = null;
  if (album.primaryArtist) {
    const { data, error } = await db
      .from("artists")
      .upsert(
        {
          external_id: album.primaryArtist.externalId,
          name: album.primaryArtist.name,
        },
        { onConflict: "external_id" },
      )
      .select("id")
      .single();
    if (error) throw error;
    artistId = data.id;
  }

  const hasCover = await fetchCover(album.externalId, "HEAD");
  const { error } = await db.from("albums").upsert(
    {
      external_id: album.externalId,
      title: album.title,
      artist_id: artistId,
      release_year: album.year,
      cover_url: hasCover ? coverUrl(album.externalId) : null,
    },
    { onConflict: "external_id", ignoreDuplicates: true },
  );
  if (error) throw error;
}
