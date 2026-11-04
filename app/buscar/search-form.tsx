"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { openAlbum } from "./actions";

const pageSize = 12;

type Result = {
  externalId: string;
  title: string;
  artist: string;
  year: number | null;
};

type SearchResult = {
  query: string;
  attempt: number;
  albums: Result[] | null;
};

export function SearchForm({
  initialQuery,
  albumError,
  registerListen = false,
}: {
  initialQuery: string;
  albumError?: string;
  registerListen?: boolean;
}) {
  const [text, setText] = useState(initialQuery);
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SearchResult>();
  const query = text.trim();
  const current =
    result?.query === query && result.attempt === attempt ? result : undefined;
  const loading = Boolean(query && !current);
  const albums = current?.albums ?? [];
  const pageCount = Math.ceil(albums.length / pageSize);
  const visibleAlbums = albums.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/buscar/resultados?${new URLSearchParams({ q: query })}`,
          { signal: controller.signal },
        );
        if (!response.ok || response.redirected)
          throw new Error("Falha na busca.");
        const albums: Result[] = await response.json();
        if (!controller.signal.aborted) setResult({ query, attempt, albums });
      } catch {
        if (!controller.signal.aborted)
          setResult({ query, attempt, albums: null });
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, attempt]);

  return (
    <>
      <div className="my-panel">
        <Input
          label="Título ou artista"
          name="q"
          type="search"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            if (event.target.value.trim() !== query) {
              setResult(undefined);
              setPage(1);
            }
          }}
          maxLength={200}
        />
      </div>
      {albumError && query === initialQuery && (
        <p role="alert" className="mb-gutter text-danger">
          {albumError}
        </p>
      )}
      <div role="status" className="text-muted">
        {loading && "Buscando álbuns…"}
        {current?.albums?.length === 0 && "Nenhum álbum encontrado."}
      </div>
      {current?.albums === null && (
        <div className="grid gap-2">
          <p role="alert" className="text-danger">
            Não foi possível buscar álbuns.
          </p>
          <Button variant="secondary" onClick={() => setAttempt(attempt + 1)}>
            Tentar novamente
          </Button>
        </div>
      )}
      {visibleAlbums.length > 0 && (
        <ul className="grid gap-3" aria-label="Resultados da busca">
          {visibleAlbums.map(({ externalId, title, artist, year }) => (
            <li key={externalId}>
              <form
                action={openAlbum.bind(null, query, externalId, registerListen)}
              >
                <Button
                  type="submit"
                  variant="secondary"
                  className="w-full gap-4 border-0 p-3 text-left hover:bg-control"
                >
                  <Image
                    src={`/album/${encodeURIComponent(externalId)}/capa`}
                    alt=""
                    width={96}
                    height={96}
                    className="size-24 shrink-0 rounded-md bg-control object-cover"
                  />
                  <span className="min-w-0 flex-1 wrap-anywhere">
                    <span className="block">{title}</span>
                    <span className="block text-sm text-muted">
                      {artist || "Artista desconhecido"} ·{" "}
                      {year ?? "Ano desconhecido"}
                    </span>
                  </span>
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
      {pageCount > 1 && (
        <nav
          aria-label="Paginação da busca"
          className="mt-panel flex flex-wrap items-center gap-2"
        >
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span role="status" className="text-sm text-muted">
            Página {page} de {pageCount}
          </span>
          <Button
            variant="secondary"
            disabled={page === pageCount}
            onClick={() => setPage(page + 1)}
          >
            Próxima
          </Button>
        </nav>
      )}
    </>
  );
}
