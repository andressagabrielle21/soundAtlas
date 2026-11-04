import { expect, it } from "vitest";
import { filterLibrary, type LibraryEntry } from "./library";

const entries: LibraryEntry[] = [
  ["Zulu", "listened", ["rock", "pop"], 1990, 4.5],
  ["Água", "listened", ["rock"], 1990, 4.5],
  ["Jazz", "listened", ["jazz"], 1990, 4.5],
  ["Década", "listened", ["rock"], 2000, 4.5],
  ["Nota", "listened", ["rock"], 1990, 5],
  ["Status", "want", ["rock"], 1990, 4.5],
  ["Sem nota", "listened", ["rock"], null, null],
].map(([title, status, genres, decade, rating], index) => ({
  status: String(status),
  rating: rating as number | null,
  created_at: `2026-01-0${index + 1}`,
  album: {
    external_id: String(index),
    title: String(title),
    genres: genres as string[],
    decade: decade as number | null,
    cover_url: null,
  },
}));

it("combina status, gênero, década e nota exata antes de ordenar por título", () => {
  expect(
    filterLibrary(entries, {
      status: "listened",
      genre: "rock",
      decade: 1990,
      rating: 4.5,
      sort: "title",
    }).map(({ album }) => album.title),
  ).toEqual(["Água", "Zulu"]);
});

it("ordena por nota decrescente com álbuns sem nota no fim", () => {
  const sorted = filterLibrary(entries, { status: "listened", sort: "rating" });
  expect(sorted[0].rating).toBe(5);
  expect(sorted.at(-1)?.rating).toBeNull();
});

it("ordena pelos álbuns adicionados mais recentemente", () => {
  expect(
    filterLibrary(entries, { status: "listened", sort: "recent" })[0].album
      .title,
  ).toBe("Sem nota");
});

it("retorna lista vazia quando a combinação não encontra álbuns", () => {
  expect(
    filterLibrary(entries, { status: "want", genre: "jazz", sort: "recent" }),
  ).toEqual([]);
});
