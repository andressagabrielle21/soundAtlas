"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp } from "../lib/supabase/auth-actions";
import { Button } from "./ui/button";
import { LoadingSpinner } from "./ui/loading-spinner";
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
    <section aria-labelledby="auth-title">
      <div className="mb-7 space-y-2">
        <h1 id="auth-title" className="text-3xl font-semibold tracking-tight">
          {title}
        </h1>
        <p className="max-w-xs text-sm leading-6 text-muted">
          {registering
            ? "Um lugar para os seus discos, notas e descobertas."
            : "Seu diário musical continua aqui."}
        </p>
      </div>
      <form action={action} className="grid gap-5" aria-busy={pending}>
        {registering && (
          <div className="space-y-2">
            <Input
              className="min-h-12 bg-surface"
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
            <p id="username-help" className="text-caption text-muted">
              Use de 3 a 30 letras, números ou sublinhados.
            </p>
          </div>
        )}
        <Input
          className="min-h-12 bg-surface"
          autoCapitalize="none"
          spellCheck={false}
          label="E-mail"
          name="email"
          type="email"
          autoComplete={registering ? "email" : "username"}
          required
        />
        <div className="space-y-2">
          <Input
            className="min-h-12 bg-surface"
            label="Senha"
            name="password"
            type="password"
            autoComplete={registering ? "new-password" : "current-password"}
            aria-describedby={registering ? "password-help" : undefined}
            minLength={registering ? 8 : undefined}
            required
          />
          {registering && (
            <p id="password-help" className="text-caption text-muted">
              Pelo menos 8 caracteres.
            </p>
          )}
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-danger/10 p-3 text-sm leading-6 text-danger"
          >
            {error}
          </p>
        )}
        {state.message && (
          <p
            role="status"
            className="rounded-lg bg-surface p-3 text-sm leading-6"
          >
            {state.message}
          </p>
        )}
        <Button
          type="submit"
          disabled={pending}
          className="mt-1 min-h-12 w-full"
        >
          {pending ? "Aguarde…" : title}
        </Button>
      </form>
      {pending && <LoadingSpinner />}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2 text-sm">
        <p className="text-muted">
          {registering ? "Já tem uma conta?" : "Primeira vez por aqui?"}
        </p>
        <Link
          href={registering ? "/entrar" : "/cadastrar"}
          className="inline-flex min-h-touch items-center font-medium text-accent underline-offset-4 hover:underline"
        >
          {registering ? "Já tenho conta" : "Criar uma conta"}
        </Link>
      </div>
    </section>
  );
}
