import { LoadingSpinner } from "../../components/ui/loading-spinner";
import { Suspense } from "react";
import { Diary } from "./diary";
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
  searchParams: Promise<{
    periodo?: string | string[];
    pagina?: string | string[];
  }>;
}) {
  const { periodo, pagina } = await searchParams;
  const client = await createClient();
  const { data, error } = await client.rpc("read_profile_data");
  const summary = data as ProfileSummary | null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <SignOutForm />
      </div>
      {error || !summary ? (
        <p role="alert" className="mt-2 text-sm text-muted">
          Não foi possível carregar seu resumo. Tente recarregar a página.
        </p>
      ) : (
        <dl className="grid grid-cols-3 gap-3 rounded-xl bg-surface px-3 py-3">
          <div className="flex min-w-0 flex-col-reverse items-center gap-0.5 text-center">
            <dt className="text-caption leading-4 text-muted">
              <span aria-hidden="true">Álbuns</span>
              <span className="sr-only">Álbuns na biblioteca</span>
            </dt>
            <dd className="max-w-full text-xl leading-6 font-medium tracking-tight tabular-nums wrap-anywhere">
              {numberFormat.format(summary.total_albums)}
            </dd>
          </div>
          <div className="flex min-w-0 flex-col-reverse items-center gap-0.5 text-center">
            <dt className="text-caption leading-4 text-muted">
              <span aria-hidden="true">Escutas</span>
              <span className="sr-only">Escutas no diário</span>
            </dt>
            <dd className="max-w-full text-xl leading-6 font-medium tracking-tight tabular-nums wrap-anywhere">
              {numberFormat.format(summary.total_listens)}
            </dd>
          </div>
          <div className="flex min-w-0 flex-col-reverse items-center gap-0.5 text-center">
            <dt className="text-caption leading-4 text-muted">
              <span aria-hidden="true">Nota média</span>
              <span className="sr-only">Nota média da biblioteca</span>
            </dt>
            <dd className="max-w-full text-xl leading-6 font-medium tracking-tight tabular-nums wrap-anywhere">
              {summary.average_rating === null ? (
                <>
                  <span aria-hidden="true">—</span>
                  <span className="sr-only">Sem notas</span>
                </>
              ) : (
                numberFormat.format(summary.average_rating)
              )}
            </dd>
          </div>
        </dl>
      )}
      <section
        id="estatisticas"
        aria-labelledby="stats-title"
        className="scroll-mt-6"
      >
        <h2 id="stats-title" className="text-lg font-semibold tracking-tight">
          Estatísticas
        </h2>
        <Suspense key={JSON.stringify(periodo)} fallback={<LoadingSpinner />}>
          <Statistics periodo={periodo} />
        </Suspense>
      </section>
      <section
        id="diario"
        aria-labelledby="diary-title"
        className="scroll-mt-6"
      >
        <h2 id="diary-title" className="text-lg font-semibold tracking-tight">
          Diário
        </h2>
        <Suspense key={JSON.stringify(pagina)} fallback={<LoadingSpinner />}>
          <Diary pagina={pagina} periodo={periodo} />
        </Suspense>
      </section>
      <section
        aria-labelledby="export-title"
        className="rounded-xl bg-surface p-4"
      >
        <h2 id="export-title" className="text-base font-semibold">
          Seus dados
        </h2>
        <p className="mt-2 text-sm text-muted">
          Baixe sua biblioteca e seu diário em um único arquivo.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["json", "csv"].map((format) => (
            <a
              key={format}
              href={`/api/export?format=${format}`}
              download
              className="inline-flex min-h-touch flex-1 items-center justify-center rounded-lg bg-control px-3 text-sm font-medium text-ink hover:text-accent"
            >
              Baixar {format.toUpperCase()}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
