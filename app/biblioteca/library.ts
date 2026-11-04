export type LibraryEntry = {
  status: string;
  rating: number | null;
  created_at: string | null;
  album: {
    external_id: string;
    title: string;
    genres: string[] | null;
    decade: number | null;
    cover_url: string | null;
  };
};

const titles = new Intl.Collator("pt-BR");

export function filterLibrary(
  entries: LibraryEntry[],
  filters: {
    status: string;
    genre?: string;
    decade?: number;
    rating?: number;
    sort: "recent" | "rating" | "title";
  },
) {
  return entries
    .filter(
      ({ status, album, rating }) =>
        status === filters.status &&
        (filters.genre === undefined ||
          album.genres?.includes(filters.genre)) &&
        (filters.decade === undefined || album.decade === filters.decade) &&
        (filters.rating === undefined || rating === filters.rating),
    )
    .sort((a, b) => {
      if (filters.sort === "rating") {
        const difference = (b.rating ?? 0) - (a.rating ?? 0);
        if (difference) return difference;
      }
      if (filters.sort === "recent") {
        const difference = (b.created_at ?? "").localeCompare(
          a.created_at ?? "",
        );
        if (difference) return difference;
      }
      return (
        titles.compare(a.album.title, b.album.title) ||
        a.album.external_id.localeCompare(b.album.external_id)
      );
    });
}
