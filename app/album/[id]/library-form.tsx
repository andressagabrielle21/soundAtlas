"use client";

import { useActionState } from "react";
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
  unavailable,
}: {
  status?: string;
  unavailable: boolean;
  action: (state: string | null, formData: FormData) => Promise<string | null>;
}) {
  const [error, submit, pending] = useActionState(action, null);

  return (
    <>
      {unavailable ? (
        <p role="alert" className="mb-panel">
          Não foi possível carregar o status da biblioteca.
        </p>
      ) : (
        <section aria-label="Status na biblioteca" className="mb-panel">
          <form id="album-library-form" action={submit} className="mt-2">
            <fieldset
              disabled={pending}
              className="flex flex-wrap items-end gap-2"
            >
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
            </fieldset>
          </form>
          {pending && <p role="status">Atualizando biblioteca…</p>}
          {error && <p role="alert">{error}</p>}
        </section>
      )}
    </>
  );
}
