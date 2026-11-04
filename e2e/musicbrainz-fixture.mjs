// Keep external catalog calls deterministic while exercising the real server routes.
const fetchNetwork = globalThis.fetch;
globalThis.fetch = (input, options) => {
  const url = new URL(input instanceof Request ? input.url : input);

  if (url.hostname === "musicbrainz.org") {
    const dates = url.searchParams
      .get("query")
      ?.match(/firstreleasedate:\[([\d-]+) TO ([\d-]+)\]/);
    if (url.pathname === "/ws/2/release-group" && dates) {
      return Promise.resolve(
        Response.json({
          "release-groups": [
            {
              id: "00000000-0000-4000-8000-000000000103",
              title: "Lançamento de Teste",
              "primary-type": "Album",
              "first-release-date": dates[2],
              "artist-credit": [{ name: "Artista Recente" }],
            },
          ],
        }),
      );
    }
    if (
      url.pathname === "/ws/2/release-group" &&
      url.searchParams
        .get("query")
        ?.includes("releasegroup:(horizonte AND de AND tes*)")
    ) {
      return Promise.resolve(
        Response.json({
          "release-groups": [
            {
              id: "00000000-0000-4000-8000-000000000101",
              title: "Horizonte de Teste",
              "primary-type": "Album",
              "first-release-date": "1998-03-02",
              "artist-credit": [
                {
                  name: "Banda de Teste",
                  artist: {
                    id: "00000000-0000-4000-8000-000000000102",
                    name: "Banda de Teste",
                  },
                },
              ],
            },
          ],
        }),
      );
    }
    return Promise.resolve(new Response(null, { status: 404 }));
  }

  if (url.hostname === "coverartarchive.org") {
    return Promise.resolve(new Response(null, { status: 404 }));
  }

  return fetchNetwork(input, options);
};
