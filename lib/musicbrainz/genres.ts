export const genreAliases = {
  rock: ["alternative rock", "indie rock", "classic rock", "punk rock"],
  pop: ["synth pop", "dance pop", "indie pop", "pop rock"],
  "hip hop": ["rap", "boom bap", "trap"],
  eletrônica: ["electronic", "electronica", "house", "techno", "drum and bass"],
  jazz: ["bebop", "jazz fusion", "free jazz", "smooth jazz"],
  MPB: [
    "musica popular brasileira",
    "bossa nova",
    "tropicalia",
    "tropicalismo",
  ],
  metal: ["heavy metal", "death metal", "black metal", "thrash metal"],
  samba: ["samba rock", "samba de roda", "pagode"],
  "R&B": ["rhythm and blues", "contemporary r&b", "soul", "neo soul"],
  blues: ["delta blues", "chicago blues", "electric blues"],
  reggae: ["roots reggae", "dub", "ska"],
  country: ["bluegrass", "alt country", "country rock"],
  clássica: ["classical", "baroque", "romantic classical"],
  folk: ["indie folk", "contemporary folk", "traditional folk"],
} as const;

type Genre = keyof typeof genreAliases;

function normalizeTag(tag: string) {
  return tag
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[-_‐‑–—]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const genreByTag = new Map<string, Genre>();
for (const genre of Object.keys(genreAliases) as Genre[]) {
  for (const tag of [genre, ...genreAliases[genre]]) {
    genreByTag.set(normalizeTag(tag), genre);
  }
}

export function mapGenres(tags: readonly string[]): Genre[] {
  const genres = new Set<Genre>();
  for (const tag of tags) {
    const genre = genreByTag.get(normalizeTag(tag));
    if (genre) genres.add(genre);
  }
  return [...genres];
}
