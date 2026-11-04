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
        <dl className="grid grid-cols-3 gap-2 py-1">
          <div className="flex items-center justify-around min-w-0 flex-col-reverse gap-1">
            <dt>Álbuns na biblioteca</dt>
            <dd className="text-3xl font-medium tracking-tight tabular-nums">
              {numberFormat.format(summary.total_albums)}
            </dd>
          </div>
          <div className="flex items-center justify-around min-w-0 flex-col-reverse gap-1">
            <dt>Escutas no diário</dt>
            <dd className="text-3xl font-medium tracking-tight tabular-nums">
              {numberFormat.format(summary.total_listens)}
            </dd>
          </div>
          <div className="flex items-center justify-around min-w-0 flex-col-reverse gap-1">
            <dt>Nota média da biblioteca</dt>
            <dd className="text-3xl font-medium tracking-tight tabular-nums">
              {summary.average_rating === null
                ? "?"
                : numberFormat.format(summary.average_rating)}
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
