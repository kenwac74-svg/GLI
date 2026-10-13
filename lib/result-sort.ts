export const RESULT_SORT_KEY = "gli:result-sort";
export type ResultSort = "rec" | "trust" | "new";
export const resultSortMode = (value: string | null): ResultSort =>
  value === "trust" || value === "new" ? value : "rec";

type SortItem = { index: number; grade: string; sourcePublishedAt?: string | null };
const grades = ["S", "A+", "A", "B+", "B", "C+", "C", "D"];
const gradeRank = (grade: string) => {
  const rank = grades.indexOf(grade.trim());
  return rank < 0 ? grades.length : rank;
};
const publishedTime = (date?: string | null) => {
  const time = date ? Date.parse(date) : NaN;
  return Number.isFinite(time) ? time : -Infinity;
};

// Presentation only: preserve server recommendations and never invent source dates.
export function sortResultItems<T extends SortItem>(items: T[], mode: string): T[] {
  return [...items].sort((a, b) => {
    if (mode === "trust") return gradeRank(a.grade) - gradeRank(b.grade) || a.index - b.index;
    if (mode === "new") {
      const at = publishedTime(a.sourcePublishedAt), bt = publishedTime(b.sourcePublishedAt);
      return (at === bt ? 0 : at > bt ? -1 : 1) || a.index - b.index;
    }
    return a.index - b.index;
  });
}
