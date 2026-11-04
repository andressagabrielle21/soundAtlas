import { isStarRating } from "../../components/ui/star-rating-values";

type LibraryEntry = {
  status: "want" | "listening" | "listened";
  rating: number | null;
};

type ListenLog = {
  id: string;
  listened_on: string;
  rating_at_time: number | null;
  note?: string | null;
  is_relisten: boolean;
};

type NewListen = Omit<ListenLog, "is_relisten"> & { is_relisten?: boolean };

export type AlbumDiary = {
  entry: LibraryEntry | null;
  // One user and album, with logs in insertion order to break same-day ties.
  logs: readonly ListenLog[];
};

function validateRating(rating: number | null) {
  if (rating !== null && !isStarRating(rating)) {
    throw new RangeError("A nota deve ser de 0,5 a 5 em passos de 0,5.");
  }
}

export function suggestRelisten(diary: AlbumDiary): boolean {
  return diary.logs.length > 0;
}

export function addListen(diary: AlbumDiary, input: NewListen): AlbumDiary {
  validateRating(input.rating_at_time);

  const log = {
    ...input,
    is_relisten: input.is_relisten ?? suggestRelisten(diary),
  };
  const entry = diary.entry ?? { status: "listened", rating: null };
  const isLatest = diary.logs.every(
    (previous) => previous.listened_on <= log.listened_on,
  );

  return {
    entry:
      isLatest && log.rating_at_time !== null
        ? { ...entry, rating: log.rating_at_time }
        : entry,
    logs: [...diary.logs, log],
  };
}

function recalculateRating(
  entry: LibraryEntry | null,
  logs: readonly ListenLog[],
): AlbumDiary {
  let latestRated: ListenLog | undefined;
  for (const log of logs) {
    if (
      log.rating_at_time !== null &&
      (!latestRated || log.listened_on >= latestRated.listened_on)
    ) {
      latestRated = log;
    }
  }

  return {
    entry:
      entry && latestRated
        ? { ...entry, rating: latestRated.rating_at_time }
        : entry,
    logs,
  };
}

export function editListen(
  diary: AlbumDiary,
  id: string,
  changes: Partial<Omit<ListenLog, "id">>,
): AlbumDiary {
  if (changes.rating_at_time !== undefined)
    validateRating(changes.rating_at_time);
  if (!diary.logs.some((log) => log.id === id)) return diary;

  const logs = diary.logs.map((log) =>
    log.id === id ? { ...log, ...changes } : log,
  );
  return recalculateRating(diary.entry, logs);
}

export function removeListen(diary: AlbumDiary, id: string): AlbumDiary {
  const logs = diary.logs.filter((log) => log.id !== id);
  if (logs.length === diary.logs.length) return diary;

  return recalculateRating(diary.entry, logs);
}
