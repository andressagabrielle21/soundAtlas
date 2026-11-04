import { describe, expect, it } from "vitest";
import { mapGenres } from "./genres";

describe("mapGenres", () => {
  it.each([
    ["alternative rock", "rock"],
    ["indie rock", "rock"],
    ["synth-pop", "pop"],
    ["dance pop", "pop"],
    ["hip-hop", "hip hop"],
    ["rap", "hip hop"],
    ["house", "eletrônica"],
    ["techno", "eletrônica"],
    ["bebop", "jazz"],
    ["jazz fusion", "jazz"],
    ["bossa nova", "MPB"],
    ["tropicália", "MPB"],
    ["heavy metal", "metal"],
    ["samba rock", "samba"],
    ["r&b", "R&B"],
    ["delta blues", "blues"],
    ["roots reggae", "reggae"],
    ["bluegrass", "country"],
    ["classical", "clássica"],
  ])("mapeia %s para %s", (tag, genre) => {
    expect(mapGenres([tag])).toEqual([genre]);
  });

  it("ignora tags desconhecidas e vazias", () => {
    expect(mapGenres(["favorite albums", "1990s", " ", "unknown"])).toEqual([]);
    expect(mapGenres([])).toEqual([]);
  });

  it("normaliza capitalização, acentos e espaços e mantém a ordem sem duplicatas", () => {
    expect(
      mapGenres([
        "  TROPICALIA ",
        "bossa   nova",
        "HIP_HOP",
        "rock",
        "synth–pop",
        "favorito",
      ]),
    ).toEqual(["MPB", "hip hop", "rock", "pop"]);
  });
});
