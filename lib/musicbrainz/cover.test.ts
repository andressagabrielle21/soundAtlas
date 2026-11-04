import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const id = "48140466-cff6-3222-bd55-63c27e43190d";
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.resetModules();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("MUSICBRAINZ_USER_AGENT", "SoundAtlas/0.1 (contact@example.com)");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("busca a capa frontal pelo ID do release-group", async () => {
  const image = new Response(null, {
    headers: { "Content-Type": "image/jpeg" },
  });
  fetchMock.mockResolvedValue(image);
  const { fetchCover } = await import("./cover");

  await expect(fetchCover(id, "HEAD")).resolves.toBe(image);
  expect(fetchMock).toHaveBeenCalledWith(
    `https://coverartarchive.org/release-group/${id}/front-250`,
    expect.objectContaining({ method: "HEAD" }),
  );
});

it.each([404, 503])(
  "sinaliza fallback quando o arquivo responde %s",
  async (status) => {
    fetchMock.mockResolvedValue(new Response(null, { status }));
    const { fetchCover } = await import("./cover");

    await expect(fetchCover(id, "GET")).resolves.toBeNull();
  },
);

it("não consulta o serviço para um ID inválido", async () => {
  const { fetchCover } = await import("./cover");

  await expect(fetchCover("../invalid", "GET")).resolves.toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});
