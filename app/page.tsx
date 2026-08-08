import { LandingPage } from "./components/landing-page";
import { SiteHeader } from "./components/site-header";
import { listAssets } from "../lib/assets-data";
import { listCuratedOpportunities } from "../lib/curated-opportunities";

export const dynamic = "force-dynamic";

export default async function Home() {
  const result = await listAssets({ limit: 100 });
  const allAssets = [...result.assets, ...listCuratedOpportunities()];

  return (
    <>
      <SiteHeader />
      <LandingPage assets={allAssets} />
    </>
  );
}
