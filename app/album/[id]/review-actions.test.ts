import { beforeEach, expect, it, vi } from "vitest";
import { saveReview } from "./review-actions";

const { from, update, match, select, maybeSingle } = vi.hoisted(() => ({
  from: vi.fn(),
  update: vi.fn(),
  match: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../../../lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) },
    from,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  from.mockReturnValue({ update });
  update.mockReturnValue({ match });
  match.mockReturnValue({ select });
  select.mockReturnValue({ maybeSingle });
  maybeSingle.mockResolvedValue({ data: { id: "entry" }, error: null });
});

function submit(rating: string, review: string) {
  const form = new FormData();
  form.set("rating", rating);
  form.set("review", review);
  return saveReview("album", "/album/external", null, form);
}

it.each(["0", "5.5", "2.25", "NaN"])("rejeita nota %s", async (rating) => {
  expect(await submit(rating, "")).toMatchObject({ error: expect.any(String) });
  expect(from).not.toHaveBeenCalled();
});

it("rejeita uma resenha acima do limite", async () => {
  expect(await submit("2.5", "a".repeat(5001))).toMatchObject({
    error: expect.any(String),
  });
  expect(from).not.toHaveBeenCalled();
});

it("atualiza apenas a entrada do usuário e não cria log", async () => {
  const review = "a".repeat(5000);
  expect(await submit("2.5", review)).toEqual({ error: null });
  expect(from).toHaveBeenCalledExactlyOnceWith("library_entries");
  expect(update).toHaveBeenCalledWith({ rating: 2.5, review });
  expect(match).toHaveBeenCalledWith({ user_id: "owner", album_id: "album" });
});
