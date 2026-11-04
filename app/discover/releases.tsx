import Image from "next/image";
import { openAlbum } from "../buscar/actions";
import { recentAlbums } from "../../lib/musicbrainz/search";

export async function Releases({
  failed,
  fromLibrary = false,
}: {
  failed: boolean;
  fromLibrary?: boolean;
}) {
  const albums = await recentAlbums().catch(() => null);
  return (
    <>
      <h2 className="text-heading font-semibold">Lançamentos recentes</h2>
      <p className="mt-1 text-sm text-muted">
        Álbuns dos últimos 30 dias no MusicBrainz.
      </p>
      {failed && (
        <p role="alert" className="mt-3 text-danger">
          Não foi possível abrir o álbum. Tente novamente.
        </p>
      )}
      {albums === null ? (
        <p role="alert" className="mt-4 text-muted">
          Não foi possível carregar os lançamentos. Tente novamente mais tarde.
        </p>
      ) : albums.length === 0 ? (
        <p className="mt-4 text-muted">
          Nenhum lançamento encontrado neste período.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {albums.map(({ externalId, title, artist }) => (
            <li key={externalId} className="min-w-0">
              <form
                action={openAlbum.bind(
                  null,
                  null,
                  externalId,
                  false,
                  fromLibrary,
                )}
                className="h-full"
              >
                <button className="album-tile group flex h-full w-full flex-col text-left">
                  <Image
                    alt=""
                    width={160}
                    height={160}
                    sizes="(min-width: 640px) 150px, (min-width: 512px) 232px, calc((100vw - 48px) / 2)"
                    src={`/album/${encodeURIComponent(externalId)}/capa`}
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                  <span className="line-clamp-2 h-10 text-sm leading-5 font-semibold wrap-anywhere">
                    {title}
                  </span>
                  <span className="block w-full truncate text-sm text-muted">
                    {artist || "Artista desconhecido"}
                  </span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
