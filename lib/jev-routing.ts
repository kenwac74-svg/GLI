// GLI-SPEC: GS-010 GS-011 GS-012. Jev may request one clarification;
// it never changes server-owned criteria, prices, locations or candidates.
const LOCATION = /캄보디아|프놈펜|시하누크빌|시아누크빌|시엠립|캄폿|캠폿|베트남|호치민|하노이|다낭|필리핀|세부|마닐라|말레이시아|쿠알라룸푸르|cambodia|phnom penh|sihanoukville|siem reap|kampot|vietnam|ho chi minh|hanoi|da nang|philippines|cebu|manila|malaysia|kuala lumpur/i;
const PROPERTY = /부동산|물건|매물|집|주택|콘도|아파트|빌라|property|home|house|condo|apartment|villa/i;
const CLEAR_DIRECTION_OR_AMOUNT = /\d|억|만원|임차|세입|거주|실거주|살\s*집|입주|매수|투자|tenant|lease|residen|purchase|\bbuy\b|invest/i;

export function mayNeedTransactionClarification(query: string, hasContext: boolean, transaction: string | null): boolean {
  return !hasContext && transaction === null && query.length <= 180
    && LOCATION.test(query) && PROPERTY.test(query) && !CLEAR_DIRECTION_OR_AMOUNT.test(query);
}

export async function decideTransactionClarification(query: string, options: {
  apiKey: string;
  fetch: typeof fetch;
  timeoutMs?: number;
}): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 2_000);
  try {
    const response = await options.fetch("https://openrouter.ai/api/alpha/decisions", {
      method: "POST",
      headers: { authorization: `Bearer ${options.apiKey}`, "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: "typesafe/jev-1.13",
        state: { question: query },
        questions: {
          next_step: {
            type: "choice",
            instructions: "Decide whether a property advisor must first ask the customer if they want to BUY a property or RENT one as a tenant. Do not infer budget, geography, yield or property facts.",
            criteria: {
              clarify: "The user requests property candidates but gives no usable indication whether they want to buy a property or rent one as a tenant; the two searches would produce incompatible results.",
              continue: "The user already indicates purchase, rental-income investment, residential tenancy, or asks a general question that can be answered without this distinction.",
              complex: "The request is nuanced, multi-part, or otherwise needs the full counselor rather than a fixed clarification question.",
            },
          },
        },
      }),
    });
    if (!response.ok) return false;
    const payload = await response.json();
    const answer = payload?.answers?.next_step;
    return answer?.type === "choice" && answer.choice === "clarify"
      && typeof answer.probabilities?.clarify === "number" && answer.probabilities.clarify >= 0.95
      && typeof answer.confidence === "number" && answer.confidence >= 0.85;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
