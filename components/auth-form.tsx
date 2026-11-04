"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp } from "../lib/supabase/auth-actions";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";

export function AuthForm({
  mode,
  confirmationFailed = false,
}: {
  mode: "sign-in" | "sign-up";
  confirmationFailed?: boolean;
}) {
  const registering = mode === "sign-up";
  const title = registering ? "Criar conta" : "Entrar";
  const [state, action, pending] = useActionState(
    registering ? signUp : signIn,
    {},
  );
  const error =
    state.error ??
    (confirmationFailed && !state.message
      ? "O link de confirmação é inválido ou expirou. Tente se cadastrar novamente."
      : undefined);

  return (
    <Card>
      <h1 className="mb-panel text-heading font-semibold">{title}</h1>
      <form action={action} className="grid gap-gutter" aria-busy={pending}>
        {registering && (
          <Input
            label="Nome de usuário"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9_]{3,30}"
            aria-describedby="username-help"
            required
          />
        )}
        {registering && (
          <p id="username-help" className="text-caption text-muted">
            Use de 3 a 30 letras, números ou sublinhados.
          </p>
        )}
        <Input
          label="E-mail"
          name="email"
          type="email"
          autoComplete={registering ? "email" : "username"}
          required
        />
        <Input
          label="Senha"
          name="password"
          type="password"
          autoComplete={registering ? "new-password" : "current-password"}
          minLength={registering ? 8 : undefined}
          required
        />
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        {state.message && <p role="status">{state.message}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Aguarde…" : title}
        </Button>
      </form>
      <Link
        href={registering ? "/entrar" : "/cadastrar"}
        className="mt-2 inline-flex min-h-touch items-center text-accent underline"
      >
        {registering ? "Já tenho conta" : "Criar uma conta"}
      </Link>
    </Card>
  );
}
