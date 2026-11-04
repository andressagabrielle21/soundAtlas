import { redirect } from "next/navigation";
import { getStatsPeriod } from "./period";

export default async function StatsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string | string[] }>;
}) {
  const { periodo } = await searchParams;
  const { period } = getStatsPeriod(periodo);
  redirect(`/perfil?periodo=${period}#estatisticas`);
}
