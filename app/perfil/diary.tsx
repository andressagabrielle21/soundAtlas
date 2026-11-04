import { RatingStars } from "../../components/ui/rating-stars";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";

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

export async function Diary({
  pagina,
  periodo,
}: {
  pagina?: string | string[];
  periodo?: string | string[];
}) {
  const diaryHref = (target: number) => {
    const query = new URLSearchParams();
    if (typeof periodo === "string") query.set("periodo", periodo);
    if (target > 1) query.set("pagina", String(target));
    return `/perfil${query.size ? `?${query}` : ""}#diario`;
  };
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
      <p role="alert" className="mt-2">
        Não foi possível carregar suas escutas. Tente novamente.
      </p>
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
      {months.size === 0 && (
        <div className="mt-panel rounded-xl bg-surface p-gutter">
          <p>
            {page === 1
              ? "Suas escutas aparecerão aqui. Que tal registrar a primeira?"
              : "Não há escutas nesta página."}
          </p>
          <Link
            className={linkClass}
            href={page === 1 ? "/buscar?registrar=1" : diaryHref(1)}
          >
            {page === 1 ? "Escolher álbum" : "Voltar à primeira página"}
          </Link>
        </div>
      )}
      {[...months].map(([month, logs]) => (
        <section
          key={month}
          aria-labelledby={`diary-${month}`}
          className="mt-4"
        >
          <h3
            id={`diary-${month}`}
            className="text-sm font-medium text-muted capitalize"
          >
            {monthFormat.format(new Date(`${month}-01`))}
          </h3>
          <ul className="mt-2 grid gap-2">
            {logs.map(({ id, album, listened_on, rating_at_time, note }) => (
              <li key={id} className="enter-content rounded-xl bg-surface p-3">
                <Link
                  href={`/album/${album.external_id}`}
                  className="flex items-center gap-3 rounded-lg"
                >
                  <Image
                    alt=""
                    width={64}
                    height={64}
                    src={
                      album.cover_url
                        ? `/album/${album.external_id}/capa`
                        : "/album-placeholder.svg"
                    }
                    className="size-16 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1 wrap-anywhere">
                    <p className="text-sm leading-5 font-semibold">
                      {album.title}
                    </p>
                    <p className="text-caption text-muted">
                      {album.artist?.name ?? "Artista desconhecido"}
                    </p>
                    <p className="mt-0.5 text-caption text-muted">
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
                <div className="mt-3 flex items-center justify-between gap-2">
                  <time
                    dateTime={listened_on}
                    className="text-caption text-muted"
                  >
                    {dateFormat.format(new Date(listened_on))}
                  </time>
                  <div>
                    {rating_at_time === null ? (
                      <p className="text-caption text-muted">
                        Sem nota na escuta
                      </p>
                    ) : (
                      <p className="flex flex-wrap items-center gap-x-2 font-semibold">
                        <span className="text-base text-accent">
                          <RatingStars rating={rating_at_time} />
                        </span>
                        <span>
                          {ratingFormat.format(rating_at_time)}
                          <span className="sr-only"> de 5 estrelas</span>
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                {note?.trim() && (
                  <p className="mt-2 whitespace-pre-wrap wrap-anywhere">
                    {note}
                  </p>
                )}
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
            <Link className={linkClass} href={diaryHref(page - 1)}>
              Anterior
            </Link>
          )}
          <span className="text-caption text-muted">Página {page}</span>
          {data.length > pageSize && (
            <Link className={linkClass} href={diaryHref(page + 1)}>
              Próxima
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
