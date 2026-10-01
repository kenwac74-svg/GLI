import { NextResponse } from "next/server";
import { discoverVietnamReferences, isVietnamDemoRequestEnabled } from "../../../../lib/vietnam-discovery.ts";
import { getDiscoveryRepository } from "../../../../lib/discovery-storage.ts";

// GLI-SPEC: GS-005/P45; source selection runs before any outbound requests.
// This demo gate does not override review holds or resume auxiliary sources.
export async function GET(request: Request) {
  const enabled = await isVietnamDemoRequestEnabled(request.url);
  if (!enabled) return NextResponse.json({ error: "demo_only" }, { status: 403 });
  const result = await discoverVietnamReferences({ enabled });
  const repository = await getDiscoveryRepository();
  const saved = repository ? await repository.save(result.assets, result.checkedAt) : [];
  return NextResponse.json({ ...result,
    storage: { mode: repository ? "d1" : "disabled", savedCount: saved.length },
  }, { headers: { "cache-control": "no-store" } });
}
