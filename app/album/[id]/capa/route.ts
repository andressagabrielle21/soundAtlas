import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  fetchCover,
  isReleaseGroupId,
} from "../../../../lib/musicbrainz/cover";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isReleaseGroupId(id)) return new Response(null, { status: 404 });

  const cover = await fetchCover(id, "GET");
  const body =
    cover?.body ??
    new Uint8Array(
      await readFile(join(process.cwd(), "public", "album-placeholder.png")),
    );

  return new Response(body, {
    headers: {
      "Content-Type": cover?.headers.get("content-type") ?? "image/png",
      "Cache-Control": cover ? "public, max-age=86400" : "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
