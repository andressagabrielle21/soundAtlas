import "server-only";

import { isReleaseGroupId } from "./cover";
import { mapGenres } from "./genres";
import { schedule } from "./rate-limit";

type ReleaseGroup = {
  genres?: { name: string }[];
  tags?: { name: string }[];
  releases?: { id: string; status?: string; date?: string }[];
};

type Release = {
  media?: {
    position: number;
    tracks?: { id: string; title?: string; recording?: { title: string } }[];
  }[];
};

async function lookup<T>(
  entity: "release-group" | "release",
  id: string,
  include: string,
) {
  const userAgent = process.env.MUSICBRAINZ_USER_AGENT?.trim();
  if (!userAgent || !isReleaseGroupId(id))
    throw new Error("Consulta MusicBrainz inválida.");

  const url = new URL(`https://musicbrainz.org/ws/2/${entity}/${id}`);
  url.search = new URLSearchParams({ fmt: "json", inc: include }).toString();

  const response = await schedule(() =>
    fetch(url, {
      headers: { Accept: "application/json", "User-Agent": userAgent },
      signal: AbortSignal.timeout(5000),
      redirect: "error",
      next: { revalidate: 86400 },
    }),
  );
  if (!response.ok) throw new Error(`MusicBrainz HTTP ${response.status}`);
  return (await response.json()) as T;
}

export async function readAlbumDetails(id: string) {
  const group = await lookup<ReleaseGroup>(
    "release-group",
    id,
    "genres+tags+releases",
  );
  const genres = mapGenres([
    ...(group.genres ?? []).map(({ name }) => name),
    ...(group.tags ?? []).map(({ name }) => name),
  ]);
  const releases = group.releases ?? [];
  const release = [...releases].sort(
    (a, b) =>
      Number(b.status === "Official") - Number(a.status === "Official") ||
      (a.date || "9999").localeCompare(b.date || "9999"),
  )[0];

  if (!release) return { genres, discs: [] };

  try {
    const details = await lookup<Release>("release", release.id, "recordings");
    const discs = (details.media ?? [])
      .filter(({ tracks }) => tracks?.length)
      .sort((a, b) => a.position - b.position)
      .map(({ position, tracks }) => ({
        position,
        tracks: (tracks ?? []).map(({ id, title, recording }) => ({
          id,
          title: title || recording?.title || "Faixa sem título",
        })),
      }));
    return { genres, discs };
  } catch {
    return { genres, discs: null };
  }
}
