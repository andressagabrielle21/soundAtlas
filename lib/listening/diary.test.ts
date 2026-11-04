import { describe, expect, it } from "vitest";
import {
  addListen,
  editListen,
  removeListen,
  suggestRelisten,
  type AlbumDiary,
} from "./diary";

const empty: AlbumDiary = { entry: null, logs: [] };
const january = { id: "january", listened_on: "2026-01-10", rating_at_time: 4 };
const march = { id: "march", listened_on: "2026-03-10", rating_at_time: 5 };

describe("diário de escuta", () => {
  it("Titanic Rising: cria a entrada e mantém as duas escutas com suas notas", () => {
    const first = addListen(empty, january);
    expect(first.entry).toEqual({ status: "listened", rating: 4 });
    const second = addListen(first, march);
    expect(second.entry?.rating).toBe(5);
    expect(second.logs.map(({ rating_at_time }) => rating_at_time)).toEqual([
      4, 5,
    ]);
  });

  it("cria uma entrada mesmo quando a escuta não tem nota", () => {
    expect(
      addListen(empty, { ...january, rating_at_time: null }).entry,
    ).toEqual({ status: "listened", rating: null });
  });

  it("não muda a nota atual ao inserir uma escuta antiga", () => {
    expect(addListen(addListen(empty, march), january).entry?.rating).toBe(5);
  });

  it("não muda a nota ao inserir uma escuta anterior à mais recente, mesmo que ela não tenha nota", () => {
    const diary = addListen(
      { entry: { status: "want", rating: 3 }, logs: [] },
      { ...march, rating_at_time: null },
    );
    expect(addListen(diary, january).entry).toEqual({
      status: "want",
      rating: 3,
    });
  });

  it("volta à nota anterior ao excluir a escuta mais recente", () => {
    const diary = addListen(addListen(empty, january), march);
    expect(removeListen(diary, march.id).entry?.rating).toBe(4);
  });

  it("recalcula pela data editada e ignora escutas sem nota", () => {
    const diary = addListen(addListen(empty, january), march);
    expect(
      editListen(diary, march.id, { listened_on: "2025-12-10" }).entry?.rating,
    ).toBe(4);
    expect(
      editListen(diary, march.id, { rating_at_time: null }).entry?.rating,
    ).toBe(4);
  });

  it("mantém a nota manual existente quando nenhuma escuta tem nota", () => {
    const diary = {
      ...addListen(empty, january),
      entry: { status: "listened", rating: 3.5 } as const,
    };
    expect(
      editListen(diary, january.id, { rating_at_time: null }).entry?.rating,
    ).toBe(3.5);
    expect(removeListen(diary, january.id).entry?.rating).toBe(3.5);
  });

  it("sugere reescuta se o álbum já tiver um registro e aceita escolha explícita", () => {
    expect(suggestRelisten(empty)).toBe(false);
    const first = addListen(empty, january);
    expect(suggestRelisten(first)).toBe(true);
    expect(addListen(first, march).logs[1].is_relisten).toBe(true);
    expect(
      addListen(first, { ...march, is_relisten: false }).logs[1].is_relisten,
    ).toBe(false);
  });

  it.each([0, 0.25, 2.7, 5.5, NaN, Infinity])(
    "rejeita a nota %s ao criar ou editar",
    (rating_at_time) => {
      expect(() => addListen(empty, { ...january, rating_at_time })).toThrow(
        RangeError,
      );
      expect(() =>
        editListen(addListen(empty, january), january.id, { rating_at_time }),
      ).toThrow(RangeError);
    },
  );

  it.each([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5])(
    "aceita a nota %s",
    (rating_at_time) => {
      expect(
        addListen(empty, { ...january, rating_at_time }).entry?.rating,
      ).toBe(rating_at_time);
    },
  );
});
