import { ExploreClient } from "./components/explore-client";
import { SiteHeader } from "./components/site-header";
import { assets } from "../lib/assets";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <ExploreClient initialAssets={assets} />
    </>
  );
}
