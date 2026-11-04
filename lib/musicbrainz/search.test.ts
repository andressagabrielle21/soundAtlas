import { performance as realPerformance } from "node:perf_hooks";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const fetchMock = vi.fn<typeof fetch>();

describe("searchAlbums", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv(
      "MUSICBRAINZ_USER_AGENT",
      "SoundAtlas/0.1 (contact@example.com)",
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("busca álbuns por título ou artista e preserva créditos e anos parciais", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        "release-groups": [
          {
            id: "album-id",
            title: "Álbum",
            "primary-type": "Album",
            "first-release-date": "1997-04",
            "artist-credit": [
              { name: "Artista A", joinphrase: " feat. " },
              { artist: { name: "Artista B" } },
            ],
          },
          {
            id: "unknown-year",
            title: "Outro álbum",
            "primary-type": "Album",
            "artist-credit": [{ name: "Artista A" }],
          },
          { id: "single", title: "Single", "primary-type": "Single" },
        ],
      }),
    );
    const { searchAlbums } = await import("./search");
    await expect(searchAlbums('  A "B" + C  ')).resolves.toEqual([
      {
        externalId: "album-id",
        primaryArtist: null,
        title: "Álbum",
        artist: "Artista A feat. Artista B",
        year: 1997,
      },
      {
        externalId: "unknown-year",
        primaryArtist: null,
        title: "Outro álbum",
        artist: "Artista A",
        year: null,
      },
    ]);

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(
      "https://musicbrainz.org/ws/2/release-group?",
    );
    expect(new URL(String(url)).searchParams.get("query")).toBe(
      String.raw`(releasegroup:"A \"B\" + C" OR artist:"A \"B\" + C" OR releasegroup:(a AND b AND c*) OR artist:(a AND b AND c*)) AND primarytype:Album`,
    );
    expect(new Headers(options?.headers).get("User-Agent")).toBe(
      "SoundAtlas/0.1 (contact@example.com)",
    );
  });

  it.each(["Titanic Ris", "Weyes Blo"])(
    "busca pelo último termo incompleto em %s",
    async (text) => {
      fetchMock.mockResolvedValue(Response.json({ "release-groups": [] }));
      const { searchAlbums } = await import("./search");
      await searchAlbums(text);
      const query = new URL(
        String(fetchMock.mock.calls[0][0]),
      ).searchParams.get("query");
      const [first, last] = text.toLowerCase().split(" ");
      expect(query).toContain(`releasegroup:(${first} AND ${last}*)`);
      expect(query).toContain(`artist:(${first} AND ${last}*)`);
    },
  );

  it("consulta lançamentos, exclui datas fora do período e ordena por recência", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        "release-groups": [
          {
            id: "older",
            title: "Anterior",
            "primary-type": "Album",
            "first-release-date": "2026-10-20",
            "artist-credit": [],
          },
          {
            id: "recent",
            title: "Recente",
            "primary-type": "Album",
            "first-release-date": "2026-11-02",
            "artist-credit": [],
          },
          {
            id: "future",
            title: "Futuro",
            "primary-type": "Album",
            "first-release-date": "2026-11-05",
            "artist-credit": [],
          },
        ],
      }),
    );
    const { recentAlbums } = await import("./search");
    const albums = await recentAlbums(new Date("2026-11-04T12:00:00Z"));
    expect(albums.map(({ externalId }) => externalId)).toEqual([
      "recent",
      "older",
    ]);
    expect(
      new URL(String(fetchMock.mock.calls[0][0])).searchParams.get("query"),
    ).toBe("primarytype:Album AND firstreleasedate:[2026-10-05 TO 2026-11-04]");
  });

  it("reutiliza buscas idênticas, inclusive enquanto a primeira está em andamento", async () => {
    fetchMock.mockResolvedValue(Response.json({ "release-groups": [] }));
    const { searchAlbums } = await import("./search");

    await Promise.all([searchAlbums("Álbum"), searchAlbums("Álbum")]);
    await expect(searchAlbums(" álbum ")).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("entrega Titanic Rising imediatamente pelo endpoint com cache aquecido", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        "release-groups": [
          {
            id: "8bd8c6f9-4209-4793-bcc1-0b77c28b0f45",
            title: "Titanic Rising",
            "primary-type": "Album",
            "artist-credit": [{ name: "Weyes Blood" }],
            "first-release-date": "2019-04-05",
          },
        ],
      }),
    );
    const { GET } = await import("../../app/buscar/resultados/route");
    const request = new Request(
      "http://localhost/buscar/resultados?q=Titanic+Rising",
    );
    await GET(request);

    const start = realPerformance.now();
    const response = await GET(request);
    expect(await response.json()).toEqual([
      {
        externalId: "8bd8c6f9-4209-4793-bcc1-0b77c28b0f45",
        title: "Titanic Rising",
        artist: "Weyes Blood",
        year: 2019,
      },
    ]);
    expect(realPerformance.now() - start).toBeLessThan(1600);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("espaça requisições concorrentes mesmo após uma falha", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 503 }));
    fetchMock.mockImplementation(async () =>
      Response.json({ "release-groups": [] }),
    );
    const { searchAlbums } = await import("./search");
    const first = expect(searchAlbums("A")).rejects.toMatchObject({
      code: "http",
      status: 503,
    });
    const second = searchAlbums("B");
    const third = searchAlbums("C");

    await first;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await second;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1000);
    await third;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("aborta uma resposta cujo corpo excede o prazo", async () => {
    fetchMock.mockImplementation(async (_url, options) => {
      const response = new Response();
      response.json = () =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener(
            "abort",
            () => reject(options.signal?.reason),
            { once: true },
          );
        });
      return response;
    });
    const { searchAlbums } = await import("./search");
    const result = expect(searchAlbums("Álbum")).rejects.toMatchObject({
      code: "timeout",
    });
    await vi.advanceTimersByTimeAsync(5000);
    await result;
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it.each([
    ["network", () => Promise.reject(new TypeError("offline"))],
    ["invalid-response", async () => Response.json({ unexpected: [] })],
    ["invalid-response", async () => new Response("invalid JSON")],
  ] as const)("reporta %s sem depender da API real", async (code, response) => {
    fetchMock.mockImplementation(response);
    const { searchAlbums } = await import("./search");
    await expect(searchAlbums("Álbum")).rejects.toMatchObject({ code });
  });

  it("evita chamadas vazias ou sem User-Agent configurado", async () => {
    vi.stubEnv("MUSICBRAINZ_USER_AGENT", "");
    const { searchAlbums } = await import("./search");
    await expect(searchAlbums("  ")).resolves.toEqual([]);
    await expect(searchAlbums("Álbum")).rejects.toMatchObject({
      code: "configuration",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
