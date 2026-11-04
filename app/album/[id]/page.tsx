import { AlbumListens } from "./album-listens";
import { ListenSheet } from "../../../components/listen-sheet";
import { saveReview } from "./review-actions";
import { ReviewForm } from "./review-form";
import { createClient } from "../../../lib/supabase/server";
import { updateLibrary } from "./library-actions";
import { LibraryForm } from "./library-form";
import Image from "next/image";
import { notFound } from "next/navigation";
import { readAlbum } from "../../../lib/catalog/albums";
import { isReleaseGroupId } from "../../../lib/musicbrainz/cover";
import { readAlbumDetails } from "../../../lib/musicbrainz/details";

export default async function AlbumPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ registrar?: string; escutas?: string }>;
}) {
  const [{ id }, { registrar, escutas }] = await Promise.all([
    params,
    searchParams,
  ]);
  if (!isReleaseGroupId(id)) notFound();

  const album = await readAlbum(id);
  if (!album) notFound();

  const artist = Array.isArray(album.artist) ? album.artist[0] : album.artist;
  const supabase = await createClient();
  const listenPage =
    escutas && /^[1-9]\d{0,7}$/.test(escutas) ? Number(escutas) : 1;
  const offset = (listenPage - 1) * 20;
  const [details, library, listens] = await Promise.all([
    readAlbumDetails(id).catch(() => null),
    supabase
      .from("library_entries")
      .select("status,rating,review")
      .eq("album_id", album.id)
      .maybeSingle(),
    supabase
      .from("listen_logs")
      .select("id,listened_on,rating_at_time,note,is_relisten", {
        count: "exact",
      })
      .eq("album_id", album.id)
      .order("listened_on", { ascending: false })
      .order("created_at", { ascending: false, nullsFirst: false })
      .order("id")
      .range(offset, offset + 20),
  ]);
  const status = library.data?.status;
  const hasListens = (listens.count ?? 0) > 0;
  const review = library.data ? (
    <ReviewForm
      rating={library.data.rating}
      review={library.data.review}
      action={saveReview.bind(null, album.id, `/album/${id}`)}
    />
  ) : null;
  const genres: string[] = [
    ...new Set<string>([...(album.genres ?? []), ...(details?.genres ?? [])]),
  ];
  const discs = details?.discs;

  return (
    <article className="min-w-0 wrap-anywhere">
      <header className="mb-panel">
        <Image
          src={album.cover_url ? `/album/${id}/capa` : "/album-placeholder.svg"}
          alt=""
          width={250}
          height={250}
          preload
          className="mx-auto mb-panel aspect-square h-auto max-w-full rounded-xl object-cover"
        />
        <h1 className="text-2xl font-semibold">{album.title}</h1>
        <p className="mt-2 text-muted">
          {artist?.name ?? "Artista desconhecido"} ·{" "}
          {album.release_year ?? "Ano desconhecido"}
        </p>
      </header>

      <LibraryForm
        status={status}
        action={updateLibrary.bind(null, album.id, `/album/${id}`)}
        unavailable={Boolean(library.error)}
      >
        <ListenSheet
          key={`listen-sheet-${album.id}`}
          albumId={album.id}
          title={album.title}
          openOnLoad={registrar === "1"}
        >
          {hasListens && review && (
            <details className="mt-panel">
              <summary className="flex min-h-touch cursor-pointer items-center text-accent">
                Nota e resenha do álbum
              </summary>
              {review}
            </details>
          )}
        </ListenSheet>
      </LibraryForm>

      {!hasListens && review}
      {!hasListens && !library.data && !library.error && (
        <p className="mb-panel text-muted">
          Adicione o álbum à biblioteca para dar uma nota ou escrever uma
          resenha.
        </p>
      )}

      <AlbumListens
        key={`album-listens-${album.id}`}
        albumId={album.id}
        albumPath={`/album/${id}`}
        logs={listens.data?.slice(0, 20) ?? null}
        page={listenPage}
        hasMore={(listens.data?.length ?? 0) > 20}
      />

      <section aria-labelledby="album-genres" className="mb-panel">
        <h2 id="album-genres" className="text-heading font-semibold">
          Gêneros
        </h2>
        {genres.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {genres.map((genre) => (
              <li
                key={genre}
                className="max-w-full rounded-full bg-control px-3 py-1 text-sm"
              >
                {genre}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-muted">
            {details
              ? "Nenhum gênero catalogado."
              : "Gêneros indisponíveis no momento."}
          </p>
        )}
      </section>

      <section aria-labelledby="album-tracks">
        <h2 id="album-tracks" className="text-heading font-semibold">
          Faixas
        </h2>
        {!discs && (
          <p className="mt-2 text-muted">Faixas indisponíveis no momento.</p>
        )}
        {discs?.length === 0 && (
          <p className="mt-2 text-muted">Nenhuma faixa catalogada.</p>
        )}
        {discs?.map(({ position, tracks }) => (
          <div key={position} className="mt-3">
            {discs.length > 1 && (
              <h3 className="mb-2 font-medium">Disco {position}</h3>
            )}
            <ol className="rounded-xl bg-surface">
              {tracks.map(({ id, title }, index) => (
                <li
                  key={id}
                  className="grid grid-cols-[2ch_minmax(0,1fr)] gap-3 px-gutter py-3"
                >
                  <span className="text-right text-muted tabular-nums">
                    {index + 1}
                  </span>
                  <span>{title}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>
    </article>
  );
}
