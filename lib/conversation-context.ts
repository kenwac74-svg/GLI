export type ConversationTurn = { role: "user" | "assistant"; text: string };
export const CONTEXT_TURN_LIMIT = 1_200;

// GLI-SPEC: GS-011. Bound only model context; never truncate the visible answer.
// Keep both ends (including the final follow-up question). Structured criteria
// and candidate IDs travel separately and remain authoritative for retrieval.
export function boundConversation(turns: ConversationTurn[]): ConversationTurn[] {
  return turns.slice(-8).map(({ role, text }) => ({ role, text: boundText(text.trim()) }));
}

export function parseConversation(value: unknown): ConversationTurn[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 8) return null;
  const turns: ConversationTurn[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || (item.role !== "user" && item.role !== "assistant")
      || typeof item.text !== "string" || !item.text.trim() || item.text.length > 32_000) return null;
    turns.push({ role: item.role, text: item.text });
  }
  return boundConversation(turns);
}

function boundText(text: string) {
  if (text.length <= CONTEXT_TURN_LIMIT) return text;
  return `${text.slice(0, 800)}\n[context excerpt]\n${text.slice(-380)}`;
}
