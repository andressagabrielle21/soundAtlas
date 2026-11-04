import Link from "next/link";
import { createClient } from "../../lib/supabase/server";
import { getStatsPeriod, periods } from "../estatisticas/period";

type Counts = Record<string, number>;
type Stats = Record<
  "by_month" | "by_genre" | "by_decade" | "by_rating",
  Counts
>;

const monthFormat = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const ratingFormat = new Intl.NumberFormat("pt-BR");

function BarChart({
  title,
  rows,
  label,
  libraryFilter,
}: {
  title: string;
  rows: [string, number][];
  label: (key: string) => string;
  libraryFilter?: "genre" | "decade";
}) {
  const max = rows.reduce((highest, [, count]) => Math.max(highest, count), 1);

  return (
    <section className="min-w-0 rounded-xl bg-surface p-3 sm:p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-muted">
          Sem dados para este gráfico no período.
        </p>
      ) : (
        <ul className="mt-3 space-y-2 text-sm" role="list">
          {rows.map(([key, count]) => {
            const content = (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 wrap-anywhere">{label(key)}</span>
                  <span className="shrink-0 tabular-nums">{count}</span>
                </div>
                <div
                  aria-hidden="true"
                  className="mt-1 h-1 rounded-full bg-control"
                >
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </div>
              </>
            );

            return (
              <li key={key}>
                {libraryFilter ? (
                  <Link
                    href={`/biblioteca?${new URLSearchParams({
                      status: "listened",
                      [libraryFilter]: key,
                    })}`}
                    className="flex min-h-touch flex-col justify-center rounded py-1 text-ink hover:text-accent"
                  >
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export async function Statistics({ periodo }: { periodo?: string | string[] }) {
  const { period, bounds } = getStatsPeriod(periodo);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("read_listening_stats", bounds);
  const stats = data as Stats | null;

  return (
    <>
      <nav
        aria-label="Período das estatísticas"
        className="my-3 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1 min-[400px]:grid-cols-4"
      >
        {Object.entries(periods).map(([key, label]) => (
          <Link
            key={key}
            href={`/perfil?periodo=${key}#estatisticas`}
            aria-current={period === key ? "page" : undefined}
            className="flex min-h-touch items-center justify-center rounded-lg px-2 text-center text-sm text-muted aria-[current=page]:bg-control aria-[current=page]:font-semibold aria-[current=page]:text-accent"
          >
            {label}
          </Link>
        ))}
      </nav>
      {error || !stats ? (
        <p role="alert" className="text-muted">
          Não foi possível carregar suas estatísticas. Tente recarregar a
          página.
        </p>
      ) : Object.keys(stats.by_month).length === 0 ? (
        <div className="rounded-xl bg-surface p-4">
          <h3 className="text-sm font-semibold">
            Nenhuma escuta neste período
          </h3>
          <p className="mt-2 text-muted">
            Escolha outro período ou registre uma escuta para começar a
            acompanhar seus hábitos musicais.
          </p>
          <Link
            href="/buscar"
            className="inline-flex min-h-touch items-center text-accent underline"
          >
            Buscar álbuns
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <BarChart
            title="Escutas por mês"
            rows={Object.entries(stats.by_month).sort(([a], [b]) =>
              a.localeCompare(b),
            )}
            label={(month) => monthFormat.format(new Date(`${month}-01`))}
          />
          <BarChart
            title="Escutas por gênero"
            libraryFilter="genre"
            rows={Object.entries(stats.by_genre).sort(
              ([a, first], [b, second]) =>
                second - first || a.localeCompare(b, "pt-BR"),
            )}
            label={(genre) => genre}
          />
          <BarChart
            title="Escutas por década"
            libraryFilter="decade"
            rows={Object.entries(stats.by_decade).sort(
              ([a], [b]) => Number(a) - Number(b),
            )}
            label={(decade) => `Anos ${decade}`}
          />
          <BarChart
            title="Distribuição de notas"
            rows={Object.entries(stats.by_rating).sort(
              ([a], [b]) => Number(a) - Number(b),
            )}
            label={(rating) =>
              `${ratingFormat.format(Number(rating))} estrelas`
            }
          />
        </div>
      )}
    </>
  );
}
