import { Suspense } from "react";
import { Statistics } from "./statistics";
import { SignOutForm } from "./sign-out-form";
import { createClient } from "../../lib/supabase/server";

type ProfileSummary = {
  total_albums: number;
  total_listens: number;
  average_rating: number | null;
};

const numberFormat = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
});

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string | string[] }>;
}) {
  const { periodo } = await searchParams;
  const client = await createClient();
  const { data, error } = await client.rpc("read_profile_data");
  const summary = data as ProfileSummary | null;

  return (
    <>
      <h1 className="text-heading font-semibold">Perfil</h1>
      {error || !summary ? (
        <p role="alert" className="mt-2 text-muted">
          Não foi possível carregar seu resumo. Tente recarregar a página.
        </p>
      ) : (
        <dl className="mt-4 space-y-2 rounded-xl border border-white/15 p-4">
          <div className="flex justify-between gap-3">
            <dt>Álbuns na biblioteca</dt>
            <dd>{numberFormat.format(summary.total_albums)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Escutas no diário</dt>
            <dd>{numberFormat.format(summary.total_listens)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Nota média da biblioteca</dt>
            <dd className="shrink-0">
              {summary.average_rating === null
                ? "Sem notas"
                : numberFormat.format(summary.average_rating)}
            </dd>
          </div>
        </dl>
      )}
      <section
        id="estatisticas"
        aria-labelledby="stats-title"
        className="mt-panel scroll-mt-4"
      >
        <h2 id="stats-title" className="text-heading font-semibold">
          Estatísticas
        </h2>
        <Suspense
          key={JSON.stringify(periodo)}
          fallback={
            <p role="status" className="mt-panel text-muted">
              Carregando estatísticas…
            </p>
          }
        >
          <Statistics periodo={periodo} />
        </Suspense>
      </section>
      <section className="mt-4">
        <h2 className="text-lg font-semibold">Exportar meus dados</h2>
        <p className="mt-2 text-muted">
          Baixe sua biblioteca e seu diário em um único arquivo.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["json", "csv"].map((format) => (
            <a
              key={format}
              href={`/api/export?format=${format}`}
              download
              className="inline-flex min-h-touch items-center rounded-lg border border-outline px-3 text-accent"
            >
              Baixar {format.toUpperCase()}
            </a>
          ))}
        </div>
      </section>
      <SignOutForm />
    </>
  );
}
