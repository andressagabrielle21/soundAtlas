import { LoadingSpinner } from "../../components/ui/loading-spinner";
import { Suspense } from "react";
import { Releases } from "../discover/releases";
import { RatingStars } from "../../components/ui/rating-stars";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "../../components/ui/button";
import {
  isStarRating,
  starRatingOptions,
} from "../../components/ui/star-rating-values";
import { createClient } from "../../lib/supabase/server";
import { filterLibrary, type LibraryEntry } from "./library";

const pageSize = 24;
const tabs = [
  { value: "listened", label: "Já ouvi" },
  { value: "want", label: "Quero ouvir" },
  { value: "listening", label: "Ouvindo" },
];

const selectClass = "w-full min-h-touch rounded-lg bg-surface px-2";
const linkClass = "inline-flex min-h-touch items-center rounded-lg px-3";
const numberFormat = new Intl.NumberFormat("pt-BR");

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (params.aba === "discover") {
    return (
      <>
        <h1 className="text-2xl font-semibold tracking-tight">Biblioteca</h1>
        <Link
          href="/biblioteca"
          className="my-3 inline-flex min-h-touch items-center text-accent"
        >
          Minha coleção
        </Link>
        <Suspense fallback={<LoadingSpinner />}>
          <Releases fromLibrary failed={params.erro === "album"} />
        </Suspense>
      </>
    );
  }
  const status =
    tabs.find(({ value }) => value === params.status)?.value ?? "listened";
  const genre =
    typeof params.genre === "string" && params.genre ? params.genre : undefined;
  const decade =
    typeof params.decade === "string" && /^-?\d+$/.test(params.decade)
      ? Number(params.decade)
      : undefined;
  const rawRating =
    typeof params.rating === "string" ? Number(params.rating) : undefined;
  const rating = isStarRating(rawRating) ? rawRating : undefined;
  const sort =
    params.sort === "rating" || params.sort === "title"
      ? params.sort
      : "recent";
  const view = params.view === "list" ? "list" : "grid";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const entries: LibraryEntry[] = [];
  const batchSize = 500;
  for (let offset = 0; ; offset += batchSize) {
    const { data, error } = await supabase
      .from("library_entries")
      .select(
        "status,rating,created_at,album:albums!inner(external_id,title,genres,decade,cover_url,artist:artists(name))",
      )
      .eq("user_id", user.id)
      .order("id")
      .range(offset, offset + batchSize - 1)
      .overrideTypes<LibraryEntry[], { merge: false }>();
    if (error) {
      return (
        <>
          <h1 className="text-heading font-semibold">Biblioteca</h1>
          <p role="alert" className="mt-2">
            Não foi possível carregar a biblioteca. Tente novamente.
          </p>
        </>
      );
    }
    entries.push(...data);
    if (data.length < batchSize) break;
  }

  const genres = [
    ...new Set([
      ...entries.flatMap(({ album }) => album.genres ?? []),
      ...(genre ? [genre] : []),
    ]),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const decades = [
    ...new Set([
      ...entries.flatMap(({ album }) =>
        album.decade === null ? [] : [album.decade],
      ),
      ...(decade === undefined ? [] : [decade]),
    ]),
  ].sort((a, b) => b - a);
  const results = filterLibrary(entries, {
    status,
    genre,
    decade,
    rating,
    sort,
  });
  const requestedPage =
    typeof params.pagina === "string" && /^[1-9]\d{0,7}$/.test(params.pagina)
      ? Number(params.pagina)
      : 1;
  const pageCount = Math.ceil(results.length / pageSize);
  const page = Math.min(requestedPage, Math.max(1, pageCount));
  const pageResults = results.slice((page - 1) * pageSize, page * pageSize);
  const query = new URLSearchParams({ status, sort, view });
  if (genre) query.set("genre", genre);
  if (decade !== undefined) query.set("decade", String(decade));
  if (rating !== undefined) query.set("rating", String(rating));

  const pageHref = (target: number) =>
    `/biblioteca?${new URLSearchParams({ ...Object.fromEntries(query), pagina: String(target) })}`;

  return (
    <div className="relative">
      <div className="flex min-h-touch items-center justify-between gap-2 pr-14">
        <h1 className="text-2xl font-semibold tracking-tight">Biblioteca</h1>
      </div>
      <nav
        aria-label="Status da biblioteca"
        className="mt-4 flex w-full justify-center gap-1 rounded-xl bg-surface p-1"
      >
        {tabs.map((tab) => {
          const next = new URLSearchParams(query);
          next.set("status", tab.value);
          const current = status === tab.value;
          return (
            <Link
              key={tab.value}
              href={`/biblioteca?${next}`}
              aria-current={current ? "page" : undefined}
              className={`${linkClass} min-w-0 flex-1 justify-center px-1 text-sm ${current ? "bg-control font-semibold text-ink" : "text-muted hover:text-ink"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <details key={query.toString()} className="mb-4">
        <summary className="absolute top-0 right-0 grid size-touch cursor-pointer list-none place-items-center rounded-lg text-muted hover:bg-control [&::-webkit-details-marker]:hidden">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5"
          >
            <path d="M4 6h16M7 12h10m-7 6h4" />
          </svg>
          <span className="sr-only">Filtrar</span>
        </summary>
        <form
          action="/biblioteca"
          method="get"
          className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-surface p-3"
        >
          <input type="hidden" name="status" value={status} />
          <label className="min-w-0">
            Gênero
            <select
              name="genre"
              defaultValue={genre ?? ""}
              className={selectClass}
            >
              <option value="">Todos</option>
              {genres.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Década
            <select
              name="decade"
              defaultValue={decade ?? ""}
              className={selectClass}
            >
              <option value="">Todas</option>
              {decades.map((value) => (
                <option key={value} value={value}>
                  Anos {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nota
            <select
              name="rating"
              defaultValue={rating ?? ""}
              className={selectClass}
            >
              <option value="">Todas</option>
              {starRatingOptions.flat().map((value) => (
                <option key={value} value={value}>
                  {numberFormat.format(value)} estrelas
                </option>
              ))}
            </select>
          </label>
          <label>
            Ordenação
            <select name="sort" defaultValue={sort} className={selectClass}>
              <option value="recent">Recentes</option>
              <option value="rating">Nota</option>
              <option value="title">Título</option>
            </select>
          </label>
          <label>
            Visualização
            <select name="view" defaultValue={view} className={selectClass}>
              <option value="grid">Grade</option>
              <option value="list">Lista</option>
            </select>
          </label>
          <Button type="submit" className="self-end">
            Aplicar
          </Button>
        </form>
      </details>

      <div className="mb-3 flex items-center justify-between gap-2 text-sm text-muted">
        <p>
          {results.length} {results.length === 1 ? "?lbum" : "?lbuns"}
        </p>
        <p>
          {sort === "rating"
            ? "Por nota"
            : sort === "title"
              ? "Por t?tulo"
              : "Mais recentes"}
        </p>
      </div>
      {results.length ? (
        <ul
          className={
            view === "grid"
              ? "grid grid-cols-2 items-start gap-x-3 gap-y-5 sm:grid-cols-3"
              : "grid gap-2"
          }
        >
          {pageResults.map(({ album, rating }) => (
            <li key={album.external_id} className="min-w-0">
              <Link
                href={`/album/${album.external_id}`}
                className={`album-tile group flex gap-2 ${view === "grid" ? "flex-col" : "items-center gap-3 rounded-xl bg-surface p-2"}`}
              >
                <Image
                  alt=""
                  width={160}
                  height={160}
                  sizes={
                    view === "grid"
                      ? "(min-width: 640px) 152px, (min-width: 512px) 234px, calc((100vw - 44px) / 2)"
                      : "56px"
                  }
                  src={
                    album.cover_url
                      ? `/album/${album.external_id}/capa`
                      : "/album-placeholder.svg"
                  }
                  className={`aspect-square rounded-lg bg-surface object-cover ${view === "grid" ? "w-full" : "w-14 shrink-0"}`}
                />
                <div className="min-w-0 flex-1 space-y-0.5 wrap-anywhere">
                  <p
                    className={
                      view === "grid"
                        ? "text-sm leading-[1.125rem] font-semibold group-hover:text-accent"
                        : "text-sm leading-5 font-semibold group-hover:text-accent"
                    }
                  >
                    <span
                      className={view === "grid" ? "line-clamp-2" : undefined}
                    >
                      {album.title}
                    </span>
                  </p>
                  <p className="truncate text-caption text-muted">
                    {album.artist?.name ?? "Artista desconhecido"}
                  </p>
                  <p className="text-caption leading-4 text-muted">
                    {rating === null ? (
                      "Sem nota"
                    ) : (
                      <>
                        <RatingStars rating={rating} />
                        <span className="sr-only">
                          {numberFormat.format(rating)} de 5 estrelas
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl bg-surface p-gutter">
          {genre || decade !== undefined || rating !== undefined ? (
            <>
              <p>Nenhum álbum corresponde a esses filtros.</p>
              <Link
                className={`${linkClass} underline`}
                href={`/biblioteca?${new URLSearchParams({ status, sort, view })}`}
              >
                Limpar filtros
              </Link>
            </>
          ) : (
            <>
              <p>Você ainda não tem álbuns neste status.</p>
              <Link className={`${linkClass} underline`} href="/buscar">
                Buscar álbuns
              </Link>
            </>
          )}
        </div>
      )}
      {pageCount > 1 && (
        <nav
          aria-label="Paginação da biblioteca"
          className="mt-panel flex flex-wrap items-center gap-2"
        >
          {page > 1 && (
            <Link
              href={pageHref(page - 1)}
              className={`${linkClass} underline`}
            >
              Anterior
            </Link>
          )}
          <span className="text-caption leading-4 text-muted">
            Página {page} de {pageCount}
          </span>
          {page < pageCount && (
            <Link
              href={pageHref(page + 1)}
              className={`${linkClass} underline`}
            >
              Próxima
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
