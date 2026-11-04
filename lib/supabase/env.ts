type SupabaseEnv = { url: string; key: string };

export function getSupabaseEnv(): SupabaseEnv;
export function getSupabaseEnv(options: {
  required: false;
}): SupabaseEnv | undefined;
export function getSupabaseEnv(options?: { required: false }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    if (options?.required === false) return undefined;

    throw new Error(
      "Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return { url, key };
}
