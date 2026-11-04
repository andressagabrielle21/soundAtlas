import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../lib/supabase/server";

const pageSize = 20;
const monthFormat = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: "UTC",
});
const ratingFormat = new Intl.NumberFormat("pt-BR");
const linkClass =
  "inline-flex min-h-touch items-center rounded-lg px-3 underline";

type DiaryLog = {
  id: string;
  listened_on: string;
  rating_at_time: number | null;
  note: string | null;
  album: {
    external_id: string;
    title: string;
    cover_url: string | null;
    release_date: string | null;
    release_year: number | null;
    artist: { name: string } | null;
  };
};

export default async function DiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string | string[] }>;
}) {
  const { pagina } = await searchParams;
  const page =
    typeof pagina === "string" && /^[1-9]\d{0,7}$/.test(pagina)
      ? Number(pagina)
      : 1;
  const offset = (page - 1) * pageSize;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data, error } = await supabase
    .from("listen_logs")
    .select(
      "id,listened_on,rating_at_time,note,album:albums!inner(external_id,title,cover_url,release_date,release_year,artist:artists(name))",
    )
    .eq("user_id", user.id)
    .order("listened_on", { ascending: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .order("id")
    .range(offset, offset + pageSize)
    .overrideTypes<DiaryLog[], { merge: false }>();

  if (error) {
    return (
      <>
        <h1 className="text-heading font-semibold">Diário</h1>
        <p role="alert" className="mt-2">
          Não foi possível carregar suas escutas. Tente novamente.
        </p>
      </>
    );
  }

  const months = new Map<string, DiaryLog[]>();
  for (const log of data.slice(0, pageSize)) {
    const month = log.listened_on.slice(0, 7);
    const logs = months.get(month);
    if (logs) logs.push(log);
    else months.set(month, [log]);
  }

  return (
    <>
      <h1 className="text-heading font-semibold">Diário</h1>
      {months.size === 0 && (
        <div className="mt-panel rounded-xl bg-surface p-gutter">
          <p>
            {page === 1
              ? "Suas escutas aparecerão aqui. Que tal registrar a primeira?"
              : "Não há escutas nesta página."}
          </p>
          <Link
            className={linkClass}
            href={page === 1 ? "/buscar?registrar=1" : "/"}
          >
            {page === 1 ? "Escolher álbum" : "Voltar à primeira página"}
          </Link>
        </div>
      )}
      {[...months].map(([month, logs]) => (
        <section
          key={month}
          aria-labelledby={`diary-${month}`}
          className="mt-panel"
        >
          <h2
            id={`diary-${month}`}
            className="text-lg font-semibold capitalize"
          >
            {monthFormat.format(new Date(`${month}-01`))}
          </h2>
          <ul className="mt-2 grid gap-2">
            {logs.map(({ id, album, rating_at_time, note }) => (
              <li key={id} className="enter-content rounded-xl bg-surface p-3">
                <Link
                  href={`/album/${album.external_id}`}
                  className="flex items-center gap-3 rounded-lg"
                >
                  <Image
                    alt=""
                    width={96}
                    height={96}
                    src={
                      album.cover_url
                        ? `/album/${album.external_id}/capa`
                        : "/album-placeholder.svg"
                    }
                    className="size-24 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 wrap-anywhere">
                    <p className="font-semibold underline">{album.title}</p>
                    <p className="text-sm text-muted">
                      {album.artist?.name ?? "Artista desconhecido"}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {album.release_date ? (
                        <>
                          Lançamento:{" "}
                          <time dateTime={album.release_date}>
                            {dateFormat.format(new Date(album.release_date))}
                          </time>
                        </>
                      ) : album.release_year ? (
                        <>Lançamento: {album.release_year}</>
                      ) : (
                        "Lançamento desconhecido"
                      )}
                    </p>
                  </div>
                </Link>
                <div className="mt-3 border-t border-outline pt-3">
                  {rating_at_time === null ? (
                    <p className="text-sm text-muted">Sem nota na escuta</p>
                  ) : (
                    <p className="flex flex-wrap items-center gap-x-2 font-semibold">
                      <span
                        aria-hidden="true"
                        className="relative text-2xl leading-none text-muted"
                      >
                        ☆☆☆☆☆
                        <span
                          className="absolute inset-0 text-accent"
                          style={{
                            clipPath: `inset(0 ${100 - rating_at_time * 20}% 0 0)`,
                          }}
                        >
                          ★★★★★
                        </span>
                      </span>
                      <span>
                        {ratingFormat.format(rating_at_time)}
                        <span className="sr-only"> de 5 estrelas</span>
                      </span>
                    </p>
                  )}
                  {note?.trim() && (
                    <p className="mt-2 whitespace-pre-wrap wrap-anywhere">
                      {note}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {months.size > 0 && (page > 1 || data.length > pageSize) && (
        <nav
          aria-label="Paginação do diário"
          className="mt-panel flex flex-wrap items-center gap-2"
        >
          {page > 1 && (
            <Link
              className={linkClass}
              href={page === 2 ? "/" : `/?pagina=${page - 1}`}
            >
              Anterior
            </Link>
          )}
          <span className="text-sm text-muted">Página {page}</span>
          {data.length > pageSize && (
            <Link className={linkClass} href={`/?pagina=${page + 1}`}>
              Próxima
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
