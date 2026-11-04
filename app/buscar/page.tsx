import { SearchForm } from "./search-form";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    erro?: string;
    registrar?: string;
  }>;
}) {
  const { q, erro, registrar } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 200) : "";

  return (
    <>
      <h1 className="text-heading font-semibold">
        {registrar === "1" ? "Escolher álbum para registrar escuta" : "Buscar"}
      </h1>
      <SearchForm
        key={JSON.stringify([query, erro])}
        initialQuery={query}
        registerListen={registrar === "1"}
        albumError={
          erro === "catalogo"
            ? "O catálogo está indisponível para abrir álbuns novos. A configuração do servidor precisa ser atualizada."
            : erro === "album"
              ? "Não foi possível abrir o álbum. Tente novamente."
              : undefined
        }
      />
    </>
  );
}
