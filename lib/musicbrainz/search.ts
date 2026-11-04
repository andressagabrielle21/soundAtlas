import "server-only";

import { schedule } from "./rate-limit";
const requestTimeoutMs = 5000;

export type Album = {
  primaryArtist: { externalId: string; name: string } | null;
  externalId: string;
  title: string;
  artist: string;
  year: number | null;
  releaseDate?: string;
};

type ErrorCode =
  "configuration" | "http" | "network" | "timeout" | "invalid-response";

export class MusicBrainzError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "MusicBrainzError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseAlbums(payload: unknown): Album[] {
  if (!isRecord(payload) || !Array.isArray(payload["release-groups"])) {
    throw new MusicBrainzError(
      "invalid-response",
      "Resposta inválida do MusicBrainz.",
    );
  }

  const albums: Album[] = [];
  for (const group of payload["release-groups"]) {
    if (!isRecord(group) || group["primary-type"] !== "Album") continue;

    const { id, title } = group;
    const credits = group["artist-credit"];
    if (
      typeof id !== "string" ||
      typeof title !== "string" ||
      !Array.isArray(credits)
    ) {
      throw new MusicBrainzError(
        "invalid-response",
        "Álbum inválido na resposta do MusicBrainz.",
      );
    }

    const artist = credits
      .map((credit: unknown) => {
        if (!isRecord(credit)) return "";
        const name =
          credit.name ??
          (isRecord(credit.artist) ? credit.artist.name : undefined);
        if (typeof name !== "string") return "";
        return (
          name +
          (typeof credit.joinphrase === "string" ? credit.joinphrase : "")
        );
      })
      .join("");

    const firstCredit: unknown = credits[0];
    const primary = isRecord(firstCredit) ? firstCredit.artist : undefined;
    const primaryArtist =
      isRecord(primary) &&
      typeof primary.id === "string" &&
      typeof primary.name === "string"
        ? { externalId: primary.id, name: primary.name }
        : null;

    const date = group["first-release-date"];
    const year =
      typeof date === "string" ? /^(\d{4})(?:-|$)/.exec(date)?.[1] : undefined;
    const releaseDate =
      typeof date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      !date.startsWith("0000") &&
      new Date(date).toJSON()?.slice(0, 10) === date
        ? date
        : undefined;
    albums.push({
      externalId: id,
      primaryArtist,
      title,
      artist,
      year: year ? Number(year) : null,
      ...(releaseDate ? { releaseDate } : {}),
    });
  }
  return albums;
}

async function fetchAlbums(url: URL, userAgent: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": userAgent },
      signal: controller.signal,
      redirect: "error",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new MusicBrainzError(
        "http",
        "O MusicBrainz retornou um erro.",
        response.status,
      );
    }

    return parseAlbums(await response.json());
  } catch (error) {
    if (controller.signal.aborted) {
      throw new MusicBrainzError(
        "timeout",
        "O MusicBrainz demorou para responder.",
      );
    }
    if (error instanceof MusicBrainzError) throw error;
    if (error instanceof SyntaxError) {
      throw new MusicBrainzError(
        "invalid-response",
        "Resposta inválida do MusicBrainz.",
      );
    }
    throw new MusicBrainzError(
      "network",
      "Não foi possível conectar ao MusicBrainz.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

const searches = new Map<
  string,
  { results: Promise<Album[]>; expiresAt: number }
>();
const searchTtlMs = 10 * 60_000;
const maxCachedSearches = 128;

export async function searchAlbums(text: string): Promise<Album[]> {
  const query = text.trim();
  if (!query) return [];

  const key = query.toLowerCase();
  const cached = searches.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.results;

  const userAgent = process.env.MUSICBRAINZ_USER_AGENT?.trim();
  if (!userAgent) {
    throw new MusicBrainzError(
      "configuration",
      "Configure MUSICBRAINZ_USER_AGENT.",
    );
  }

  const phrase = query.replace(/["\\]/g, "\\$&");
  const words = key.normalize("NFC").match(/[\p{L}\p{M}\p{N}]+/gu) ?? [];
  const prefix = words
    .map((word, index) => (index === words.length - 1 ? `${word}*` : word))
    .join(" AND ");
  const partial = prefix
    ? ` OR releasegroup:(${prefix}) OR artist:(${prefix})`
    : "";
  const url = new URL("https://musicbrainz.org/ws/2/release-group");
  url.searchParams.set(
    "query",
    `(releasegroup:"${phrase}" OR artist:"${phrase}"${partial}) AND primarytype:Album`,
  );
  url.searchParams.set("fmt", "json");

  const entry = {
    results: schedule(() => fetchAlbums(url, userAgent)),
    expiresAt: Infinity,
  };
  searches.delete(key);
  if (searches.size >= maxCachedSearches) {
    const oldest = searches.keys().next().value;
    if (oldest !== undefined) searches.delete(oldest);
  }
  searches.set(key, entry);

  try {
    const results = await entry.results;
    entry.expiresAt = Date.now() + searchTtlMs;
    return results;
  } catch (error) {
    if (searches.get(key) === entry) searches.delete(key);
    throw error;
  }
}
