import { searchAlbums } from "../../../lib/musicbrainz/search";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length > 200) {
    return Response.json({ error: "A busca é longa demais." }, { status: 400 });
  }

  try {
    const albums = await searchAlbums(query);
    return Response.json(
      albums.map(({ externalId, title, artist, year }) => ({
        externalId,
        title,
        artist,
        year,
      })),
    );
  } catch {
    return Response.json(
      { error: "Não foi possível buscar álbuns." },
      { status: 502 },
    );
  }
}
