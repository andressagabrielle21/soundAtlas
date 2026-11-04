"use client";

import { useActionState, useState } from "react";
import { Button } from "../../../components/ui/button";

export function LibraryForm({
  status,
  action,
}: {
  status?: string;
  action: (state: string | null, formData: FormData) => Promise<string | null>;
}) {
  const [error, submit, pending] = useActionState(action, null);
  const [removing, setRemoving] = useState(false);

  return (
    <section aria-labelledby="album-library" className="mb-panel">
      <h2 id="album-library" className="text-heading font-semibold">
        Biblioteca
      </h2>
      <form action={submit} className="mt-2">
        <fieldset disabled={pending} className="flex flex-wrap items-end gap-2">
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
              <Button variant="secondary" onClick={() => setRemoving(false)}>
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <label className="grid gap-2">
                Status
                <select
                  name="status"
                  defaultValue={status ?? ""}
                  required
                  className="min-h-touch rounded-lg border border-outline bg-surface px-3"
                >
                  <option value="" disabled>
                    Selecione um status
                  </option>
                  <option value="want">Quero ouvir</option>
                  <option value="listening">Ouvindo</option>
                  <option value="listened">Já ouvi</option>
                </select>
              </label>
              <Button type="submit">Salvar status</Button>
              {status && (
                <Button variant="secondary" onClick={() => setRemoving(true)}>
                  Remover da biblioteca
                </Button>
              )}
            </>
          )}
        </fieldset>
      </form>
      {pending && <p role="status">Atualizando biblioteca…</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
