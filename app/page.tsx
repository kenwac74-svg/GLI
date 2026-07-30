import { ExploreClient } from "./components/explore-client";
import { SiteHeader } from "./components/site-header";
import { listAssets } from "../lib/assets-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const result = await listAssets({ country: "Cambodia", city: "Phnom Penh", limit: 100 });
  return (
    <>
      <SiteHeader />
      <ExploreClient initialAssets={result.assets} />
    </>
  );
}
