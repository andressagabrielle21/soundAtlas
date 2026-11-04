"use client";

import { useActionState } from "react";
import { Button } from "../../components/ui/button";
import { signOut } from "../../lib/supabase/auth-actions";

export function SignOutForm() {
  const [error, action, pending] = useActionState(signOut, "");

  return (
    <form action={action} className="text-right">
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saindo…" : "Sair"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
