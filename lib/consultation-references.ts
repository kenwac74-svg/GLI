import type { Asset } from "./assets.ts";

export type ConsultationReference = { id: string; asset: Asset | null };
export type ConsultationAction = { kind: "search" | "review"; assetIds: string[] };

// Public IDs are selections, never authority for prices, visibility or access.
export function parseAssetReferences(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 18 || new Set(value).size !== value.length) return null;
  if (value.some(id => typeof id !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,159}$/.test(id))) return null;
  return value as string[];
}

export async function resolveAssetReferences(ids: string[], lookup: (id: string) => Promise<Asset | null>): Promise<ConsultationReference[]> {
  const references: ConsultationReference[] = [];
  for (const id of ids) references.push({ id, asset: await lookup(id) });
  return references;
}

export function referenceHint(query: string, references: ConsultationReference[], selected: string[] = []): ConsultationAction | null {
  if (/조건\s*초기화|처음부터|새\s*탐색/.test(query)) return null;
  if (selected.length) return { kind: "review", assetIds: selected };
  const ordinals: number[] = [];
  const pattern = /(첫\s*번째|두\s*번째|세\s*번째|네\s*번째|다섯\s*번째|\d+\s*번(?:째)?)/g;
  const words = ["첫번째", "두번째", "세번째", "네번째", "다섯번째"];
  for (const match of query.matchAll(pattern)) {
    const word = match[0].replace(/\s/g, "");
    const index = words.includes(word) ? words.indexOf(word) : Number.parseInt(word, 10) - 1;
    ordinals.push(index);
  }
  if (ordinals.length && /물건|매물|자산|후보|번째|비교/.test(query)) {
    // An out-of-range ordinal must ask, not silently select the remaining IDs.
    if (ordinals.some(index => !references[index])) return { kind: "review", assetIds: [] };
    return { kind: "review", assetIds: [...new Set(ordinals.map(index => references[index].id))] };
  }
  if (/(이|그)\s*(매물|물건|자산)/.test(query) && references.length !== 1) return { kind: "review", assetIds: [] };
  if (/(이전|앞서|아까|방금|기존).*(후보|물건|매물|자산)|이\s*(매물|물건|자산)|그\s*(매물|물건|자산)/.test(query)
    && !/새로운?.*(찾|검색)|다시\s*(찾|검색)/.test(query)) {
    return { kind: "review", assetIds: references.map(reference => reference.id) };
  }
  return null;
}
