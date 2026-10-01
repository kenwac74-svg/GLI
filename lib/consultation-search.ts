import type { Asset } from "./assets.ts";
import { interpretConsultation } from "./consultation-intent.ts";
import { searchAssetsByCriteria, searchCountries, type SearchCriteria } from "./search.ts";
import { convertCurrency, type ExchangeRateSnapshot } from "./currency.ts";

// The same validated state drives collection, filtering and the final counselor.
export async function prepareConsultationSearch(
  query: string,
  options: Parameters<typeof interpretConsultation>[1] & { exchangeRate?: ExchangeRateSnapshot | null },
  loadCandidates: (criteria: SearchCriteria) => Promise<Asset[]>,
) {
  const intent = await interpretConsultation(query, options);
  const budget = intent.criteria.consultation?.budget;
  const rate = options.exchangeRate;
  if (budget && rate) intent.criteria.maxPriceUsd = convertCurrency(budget.amount, budget.currency, "USD", rate.rates);
  else if (intent.criteria.budgetKrw && rate) intent.criteria.maxPriceUsd = convertCurrency(intent.criteria.budgetKrw, "KRW", "USD", rate.rates);
  if ((budget && budget.currency !== "USD" || intent.criteria.budgetKrw) &&
    (options.exchangeRate === null || rate && intent.criteria.maxPriceUsd === null) && intent.action.kind !== "review") {
    intent.clarification = "환율 자료를 현재 조회할 수 없어 예산 조건을 정확히 비교하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (intent.clarification) {
    const preparedSearch = searchAssetsByCriteria(intent.criteria, [], { strict: true });
    return {
      intent, assets: [] as Asset[], review: null,
      preparedSearch: {
        ...preparedSearch,
        answer: intent.clarification,
        clarification: null,
      },
    };
  }
  if (intent.action.kind === "review") {
    const references = options.references ?? [];
    const assets = references.flatMap(({ asset }) => asset
      && searchCountries(intent.criteria).includes(asset.country as SearchCriteria["country"])
      && (!intent.criteria.city || asset.city.toLowerCase() === intent.criteria.city.toLowerCase()) ? [asset] : []);
    const missingAssetIds = intent.action.assetIds.filter(id => !assets.some(asset => asset.id === id));
    const needsClarification = !intent.action.assetIds.length || missingAssetIds.length > 0;
    const base = searchAssetsByCriteria(intent.criteria, [], { strict: true });
    return {
      intent, assets,
      review: { assetIds: intent.action.assetIds, missingAssetIds, needsClarification },
      preparedSearch: {
        ...base,
        // Keep the old display order even when a new budget rules an asset out.
        matches: assets.map(asset => ({ ...asset, matchReasons: [] as string[] })),
        answer: needsClarification
          ? missingAssetIds.length
            ? "이전에 보신 자산의 자료를 현재 조회할 수 없어 다른 물건으로 대신 비교하지 않았습니다."
            : "어느 자산에 대한 질문인지 먼저 확인하고 싶습니다."
          : "이전에 보신 후보를 기준으로 이어서 검토합니다. 임대수입과 비용 근거가 없는 항목은 확인이 필요합니다.",
        clarification: needsClarification ? "목록에서 자산 이름을 알려주시겠어요?" : null,
      },
    };
  }
  const loaded = await loadCandidates(intent.criteria);
  // One observed snapshot governs both budget and listing comparison across countries.
  const assets = rate ? loaded.map(asset => {
    const amount = convertCurrency(asset.price, asset.currency, "USD", rate.rates);
    return { ...asset, priceUsdReference: amount === null ? undefined : { amount, provider: rate.provider, asOf: rate.updatedAt } };
  }) : loaded;
  return {
    intent,
    assets,
    review: null,
    preparedSearch: searchAssetsByCriteria(intent.criteria, assets, { strict: options.provider === "openrouter" }),
  };
}
