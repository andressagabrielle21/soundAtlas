"use server";

import { revalidatePath } from "next/cache";
import { isStarRating } from "../../../components/ui/star-rating-values";
import { createClient } from "../../../lib/supabase/server";
import { REVIEW_MAX_LENGTH } from "./review-limits";

export async function saveReview(
  albumId: string,
  path: string,
  _: { error: string | null } | null,
  form: FormData,
): Promise<{ error: string | null }> {
  const rawRating = form.get("rating");
  const rating = rawRating === "" ? null : Number(rawRating);
  if (
    typeof rawRating !== "string" ||
    (rating !== null && !isStarRating(rating))
  ) {
    return { error: "Selecione uma nota de 0,5 a 5 em passos de 0,5." };
  }

  const review = form.get("review");
  if (typeof review !== "string" || review.length > REVIEW_MAX_LENGTH) {
    return { error: "A resenha deve ter até 5.000 caracteres." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Entre novamente para salvar sua avaliação." };

  const { data, error } = await supabase
    .from("library_entries")
    .update({ rating, review: review || null })
    .match({ user_id: user.id, album_id: albumId })
    .select("id")
    .maybeSingle();

  if (error)
    return { error: "Não foi possível salvar sua avaliação. Tente novamente." };
  if (!data)
    return {
      error: "Adicione o álbum à biblioteca para salvar sua avaliação.",
    };

  revalidatePath(path);
  revalidatePath("/biblioteca");
  return { error: null };
}
