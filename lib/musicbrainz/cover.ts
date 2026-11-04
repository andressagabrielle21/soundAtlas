import "server-only";

import { schedule } from "./rate-limit";

export function isReleaseGroupId(id: string) {
  return /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);
}

export function coverUrl(id: string) {
  return `https://coverartarchive.org/release-group/${id}/front-250`;
}

export async function fetchCover(id: string, method: "GET" | "HEAD") {
  const userAgent = process.env.MUSICBRAINZ_USER_AGENT?.trim();
  if (!isReleaseGroupId(id) || !userAgent) return null;

  try {
    const response = await schedule(() =>
      fetch(coverUrl(id), {
        method,
        next: { revalidate: 86400 },
        headers: { "User-Agent": userAgent },
        signal: AbortSignal.timeout(5000),
      }),
    );

    if (
      response.ok &&
      response.headers.get("content-type")?.startsWith("image/")
    ) {
      return response;
    }
    await response.body?.cancel();
  } catch {
    // Missing or unavailable artwork uses the local placeholder.
  }

  return null;
}
