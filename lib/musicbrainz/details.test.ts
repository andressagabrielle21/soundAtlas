import { afterEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const groupId = "48140466-cff6-3222-bd55-63c27e43190d";
const officialId = "76df3287-6cda-33eb-8e9a-044b5e15ffdd";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("normaliza gêneros e lê as faixas da primeira edição oficial", async () => {
  vi.useFakeTimers();
  vi.stubEnv("MUSICBRAINZ_USER_AGENT", "SoundAtlas/0.1 (contact@example.com)");
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      Response.json({
        genres: [{ name: "indie rock" }],
        tags: [{ name: "unknown" }, { name: "synth-pop" }],
        releases: [
          { id: groupId, status: "Bootleg", date: "1990" },
          { id: officialId, status: "Official", date: "2019-04-05" },
        ],
      }),
    )
    .mockResolvedValueOnce(
      Response.json({
        media: [
          { position: 2, tracks: [{ id: "b", title: "Movies" }] },
          {
            position: 1,
            tracks: [{ id: "a", recording: { title: "A Lot’s Gonna Change" } }],
          },
        ],
      }),
    );
  vi.stubGlobal("fetch", fetchMock);

  const { readAlbumDetails } = await import("./details");
  const result = readAlbumDetails(groupId);
  await vi.advanceTimersByTimeAsync(1000);

  await expect(result).resolves.toEqual({
    genres: ["rock", "pop"],
    discs: [
      { position: 1, tracks: [{ id: "a", title: "A Lot’s Gonna Change" }] },
      { position: 2, tracks: [{ id: "b", title: "Movies" }] },
    ],
  });
  expect(String(fetchMock.mock.calls[1][0])).toContain(
    `/release/${officialId}?`,
  );
});
