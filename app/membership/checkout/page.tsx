import { ClaudeDesignShell } from "../../components/claude-design-shell";

export default async function MembershipCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; cycle?: string; paid?: string }>;
}) {
  const params = await searchParams;
  const plan = params.plan === "explore" || params.plan === "private"
    ? params.plan
    : "investor";
  const cycle = params.cycle === "yearly" ? "yearly" : "monthly";
  return (
    <ClaudeDesignShell
      view="co"
      initialPlan={plan}
      initialCycle={cycle}
      initialPaid={params.paid === "1"}
    />
  );
}
