"use server";

import { redirect } from "next/navigation";
import { createClient } from "./server";

type AuthState = { error?: string; message?: string };

export async function signIn(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    return { error: "Preencha o e-mail e a senha." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Confirme seu e-mail antes de entrar." };
    }
    if (error.code === "invalid_credentials") {
      return { error: "E-mail ou senha incorretos." };
    }
    return { error: "Não foi possível entrar. Tente novamente em instantes." };
  }

  redirect("/");
}

export async function signUp(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = formData.get("email");
  const password = formData.get("password");
  const username = formData.get("username");
  const normalizedUsername =
    typeof username === "string" ? username.trim().toLowerCase() : "";

  if (!/^[a-z0-9_]{3,30}$/.test(normalizedUsername)) {
    return {
      error: "Use de 3 a 30 letras, números ou sublinhados no nome de usuário.",
    };
  }

  if (
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    password.length < 8
  ) {
    return {
      error: "Informe um e-mail e uma senha com pelo menos 8 caracteres.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { username: normalizedUsername } },
  });

  if (error) {
    if (error.code === "weak_password") {
      return {
        error:
          "A senha não atende aos requisitos de segurança. Escolha outra senha.",
      };
    }
    if (
      error.code === "email_address_invalid" ||
      error.code === "validation_failed"
    ) {
      return { error: "Verifique o e-mail informado e tente novamente." };
    }
    if (error.code === "unexpected_failure") {
      return {
        error:
          "Não foi possível criar o perfil. Tente outro nome de usuário ou tente novamente mais tarde.",
      };
    }
    return {
      error:
        "Não foi possível concluir o cadastro. Verifique os dados ou tente entrar.",
    };
  }

  if (data.session) redirect("/");

  return {
    message:
      "Confira sua caixa de entrada. Se o cadastro estiver pendente, você receberá um link de confirmação.",
  };
}

export async function signOut(): Promise<string> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) return "Não foi possível sair. Tente novamente.";

  redirect("/entrar");
}
