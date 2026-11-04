import { beforeEach, expect, it, vi } from "vitest";
import { DELETE, GET, PATCH, POST } from "./route";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../../../lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
    rpc: mocks.rpc,
  }),
}));

const album = "00000000-0000-0000-0000-000000000013";
const log = "00000000-0000-0000-0000-000000000014";
const url = "http://localhost/api/logs";
const post = (data: object) =>
  POST(new Request(url, { method: "POST", body: JSON.stringify(data) }));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "bruno" } } });
  const query = { eq: mocks.eq, maybeSingle: mocks.maybeSingle };
  mocks.from.mockReturnValue({ select: () => query });
  mocks.eq.mockReturnValue(query);
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
});

it.each([
  { listened_on: "2026-02-29" },
  { listened_on: "2026-4-01" },
  { rating_at_time: 2.25 },
  { rating_at_time: "4" },
])(
  "rejeita payload inválido antes de consultar o banco: %j",
  async (fields) => {
    expect(
      (await post({ album_id: album, listened_on: "2026-01-10", ...fields }))
        .status,
    ).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  },
);

it("não autentica acesso anônimo", async () => {
  mocks.getUser.mockResolvedValue({ data: { user: null } });
  expect((await GET(new Request(url))).status).toBe(401);
  expect(mocks.from).not.toHaveBeenCalled();
});

it("retorna 404 para escuta fora da sessão em GET, PATCH e DELETE", async () => {
  expect((await GET(new Request(`${url}?id=${log}`))).status).toBe(404);
  expect(
    (
      await PATCH(
        new Request(url, {
          method: "PATCH",
          body: JSON.stringify({ id: log, rating_at_time: 5 }),
        }),
      )
    ).status,
  ).toBe(404);
  expect(
    (await DELETE(new Request(`${url}?id=${log}`, { method: "DELETE" })))
      .status,
  ).toBe(404);
  expect(mocks.eq.mock.calls.filter(([key]) => key === "user_id")).toEqual([
    ["user_id", "bruno"],
    ["user_id", "bruno"],
    ["user_id", "bruno"],
  ]);
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it("cria a escuta e envia a entrada calculada pelo módulo à mesma transação", async () => {
  mocks.maybeSingle.mockResolvedValue({
    data: { external_id: "titanic-rising" },
    error: null,
  });
  mocks.rpc
    .mockResolvedValueOnce({ data: { entry: null, logs: [] }, error: null })
    .mockResolvedValueOnce({ error: null });
  const response = await post({
    album_id: album,
    listened_on: "2026-01-10",
    rating_at_time: 4.5,
  });
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({
    album_id: album,
    rating_at_time: 4.5,
    is_relisten: false,
  });
  expect(mocks.rpc).toHaveBeenLastCalledWith(
    "write_album_diary",
    expect.objectContaining({
      target_album: album,
      operation: "insert",
      next_entry: { status: "listened", rating: 4.5 },
    }),
  );
});
