import type { Metadata } from "next";
import { ClaudeDesignShell } from "../components/claude-design-shell";
import { CLAUDE_SOON_VIEWS } from "../generated/claude-static";

export const metadata: Metadata = { title: "준비 중 | GLI" };

export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section } = await searchParams;
  const key = section && section in CLAUDE_SOON_VIEWS
    ? (section as keyof typeof CLAUDE_SOON_VIEWS)
    : "contact";
  return <ClaudeDesignShell view="soon" soonSection={key} />;
}
