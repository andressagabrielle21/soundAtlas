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
  { value: "want", label: "Quero ouvir" },
  { value: "listening", label: "Ouvindo" },
  { value: "listened", label: "Já ouvi" },
];

const selectClass =
  "w-full min-h-touch rounded-lg border border-outline bg-surface px-2";
const linkClass = "inline-flex min-h-touch items-center rounded-lg px-3";
const numberFormat = new Intl.NumberFormat("pt-BR");

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status =
    tabs.find(({ value }) => value === params.status)?.value ?? "want";
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
        "status,rating,created_at,album:albums!inner(external_id,title,genres,decade,cover_url)",
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
    <>
      <h1 className="text-heading font-semibold">Biblioteca</h1>
      <nav
        aria-label="Status da biblioteca"
        className="mt-3 flex flex-wrap gap-1"
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
              className={`${linkClass} ${current ? "bg-accent text-on-accent" : "bg-surface"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <form
        key={query.toString()}
        action="/biblioteca"
        method="get"
        className="my-panel grid grid-cols-2 gap-2"
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

      {results.length ? (
        <ul
          className={
            view === "grid"
              ? "grid grid-cols-2 gap-3 sm:grid-cols-3"
              : "grid gap-2"
          }
        >
          {pageResults.map(({ album, rating }) => (
            <li key={album.external_id} className="min-w-0">
              <Link
                href={`/album/${album.external_id}`}
                className={`flex gap-3 rounded-xl bg-surface p-2 ${view === "grid" ? "flex-col" : "items-center"}`}
              >
                <Image
                  alt=""
                  width={160}
                  height={160}
                  sizes={
                    view === "grid"
                      ? "(min-width: 640px) 136px, (min-width: 512px) 218px, calc((100vw - 76px) / 2)"
                      : "56px"
                  }
                  src={
                    album.cover_url
                      ? `/album/${album.external_id}/capa`
                      : "/album-placeholder.svg"
                  }
                  className={`aspect-square rounded-lg object-cover ${view === "grid" ? "w-full" : "w-14"}`}
                />
                <div className="min-w-0 wrap-anywhere">
                  <p className="font-semibold">{album.title}</p>
                  <p className="text-sm text-muted">
                    {rating === null
                      ? "Sem nota"
                      : `${numberFormat.format(rating)} de 5`}
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
          <span className="text-sm text-muted">
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
    </>
  );
}
