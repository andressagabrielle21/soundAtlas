"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Button } from "../../../components/ui/button";

const statuses = [
  { value: "want", label: "Quero ouvir", icon: "M6 4h12v16l-6-4-6 4z" },
  {
    value: "listening",
    label: "Ouvindo",
    icon: "M5 13v-2a7 7 0 0 1 14 0v2M5 12H3v6h4v-6zm14 0h2v6h-4v-6z",
  },
  { value: "listened", label: "Já ouvi", icon: "m5 12 4 4L19 6" },
] as const;

export function LibraryForm({
  status,
  action,
  children,
  unavailable,
}: {
  status?: string;
  children: ReactNode;
  unavailable: boolean;
  action: (state: string | null, formData: FormData) => Promise<string | null>;
}) {
  const [removing, setRemoving] = useState(false);
  const [error, submit, pending] = useActionState(
    async (state: string | null, data: FormData) => {
      const result = await action(state, data);
      if (!result && data.get("intent") === "remove") setRemoving(false);
      return result;
    },
    null,
  );

  return (
    <>
      <div className="flex items-start gap-2">
        {children}
        {status && (
          <button
            type="button"
            aria-label="Remover da biblioteca"
            aria-expanded={removing}
            aria-controls="album-library-form"
            title="Remover da biblioteca"
            disabled={pending}
            onClick={() => setRemoving(!removing)}
            className="grid size-touch shrink-0 place-items-center rounded-lg text-muted hover:bg-control hover:text-danger disabled:opacity-50"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
            >
              <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5" />
            </svg>
          </button>
        )}
      </div>
      {unavailable ? (
        <p role="alert" className="mb-panel">
          Não foi possível carregar o status da biblioteca.
        </p>
      ) : (
        <section aria-labelledby="album-library" className="mb-panel">
          <h2 id="album-library" className="text-heading font-semibold">
            Biblioteca
          </h2>
          <form id="album-library-form" action={submit} className="mt-2">
            <fieldset
              disabled={pending}
              className="flex flex-wrap items-end gap-2"
            >
              {removing ? (
                <>
                  <label className="grid w-full gap-2">
                    O que fazer com os registros do diário?
                    <select
                      name="logs"
                      className="min-h-touch rounded-lg border border-outline bg-surface px-3"
                    >
                      <option value="keep">Manter registros</option>
                      <option value="delete">Excluir registros</option>
                    </select>
                  </label>
                  <Button type="submit" name="intent" value="remove">
                    Confirmar remoção
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setRemoving(false)}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <div
                    role="group"
                    aria-label="Status da biblioteca"
                    className="grid w-full grid-cols-3 gap-2"
                  >
                    {statuses.map(({ value, label, icon }) => (
                      <Button
                        key={value}
                        type="submit"
                        name="status"
                        value={value}
                        aria-pressed={status === value}
                        variant={status === value ? "primary" : "secondary"}
                        className="min-w-0 flex-col gap-1 px-1 text-sm"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="size-6"
                        >
                          <path d={icon} />
                        </svg>
                        {label}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </fieldset>
          </form>
          {pending && <p role="status">Atualizando biblioteca…</p>}
          {error && <p role="alert">{error}</p>}
        </section>
      )}
    </>
  );
}
