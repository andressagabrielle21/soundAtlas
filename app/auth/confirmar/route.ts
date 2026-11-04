import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";

export async function GET(request: Request) {
  const tokenHash = new URL(request.url).searchParams.get("token_hash");

  if (tokenHash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });

    if (!error) redirect("/");
  }

  redirect("/entrar?confirmacao=erro");
}
