import { LoadingSpinner } from "../../components/ui/loading-spinner";
import { Suspense } from "react";
import { Releases } from "./releases";

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <>
      <h1 className="mb-panel text-3xl font-bold tracking-tight">Discover</h1>
      <Suspense fallback={<LoadingSpinner />}>
        <Releases failed={erro === "album"} />
      </Suspense>
    </>
  );
}
