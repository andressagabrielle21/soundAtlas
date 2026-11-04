import { redirect } from "next/navigation";

export default async function DiaryRedirect({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string | string[] }>;
}) {
  const { pagina } = await searchParams;
  const query =
    typeof pagina === "string" && /^[1-9]\d{0,7}$/.test(pagina)
      ? `?pagina=${pagina}`
      : "";
  redirect(`/perfil${query}#diario`);
}
