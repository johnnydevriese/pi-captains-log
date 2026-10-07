export type MilestoneKind = "push" | "pr_opened" | "pr_merged" | "release";

export interface Milestone {
	readonly kind: MilestoneKind;
	readonly command: string;
	readonly cwd: string;
	readonly url?: string;
}

export interface BashOutcome {
	readonly command: string;
	readonly output: string;
	readonly isError: boolean;
	readonly cwd: string;
}

interface Rule {
	readonly kind: MilestoneKind;
	readonly pattern: RegExp;
	/** Output that means the step failed even though the shell exited 0 (e.g. `git push ... | tail`). */
	readonly failedOutput?: RegExp;
	readonly excludeCommand?: RegExp;
}

const COMMAND_START = String.raw`(?:^|[\s;&|(])`;

const RULES: readonly Rule[] = [
	{
		kind: "push",
		pattern: new RegExp(String.raw`${COMMAND_START}git\s+(?:-C\s+\S+\s+)?push\b`),
		failedOutput: /\[(?:remote )?rejected\]|error: failed to push|fatal:/,
		excludeCommand: /\bpush\b[^;&|]*\s(?:--dry-run|-n)\b/,
	},
	{
		kind: "pr_opened",
		pattern: new RegExp(String.raw`${COMMAND_START}gh\s+pr\s+create\b`),
		failedOutput: /\bGraphQL: |\bfailed to create\b|\bmust first push\b/i,
	},
	{
		kind: "pr_merged",
		pattern: new RegExp(String.raw`${COMMAND_START}gh\s+pr\s+merge\b`),
		failedOutput: /\bnot mergeable\b|\bfailed to merge\b|\bGraphQL: /i,
	},
	{
		kind: "release",
		pattern: new RegExp(String.raw`${COMMAND_START}gh\s+release\s+create\b`),
		failedOutput: /\bGraphQL: |\bHTTP 4\d\d\b/,
	},
];

const PR_URL = /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/;
const RELEASE_URL = /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/releases\/tag\/\S+/;

const URL_PATTERNS: Readonly<Record<MilestoneKind, RegExp | undefined>> = {
	push: undefined,
	pr_opened: PR_URL,
	pr_merged: PR_URL,
	release: RELEASE_URL,
};

const MAX_COMMAND_CHARS = 300;

/** Milestones a successful bash call reached. Failed calls, and pipelines whose output shows the step failed, reach none. */
export function detectMilestones(outcome: BashOutcome): readonly Milestone[] {
	if (outcome.isError) return [];
	const command = outcome.command.trim();
	return RULES.flatMap((rule): Milestone[] => {
		if (!rule.pattern.test(command)) return [];
		if (rule.excludeCommand?.test(command)) return [];
		if (rule.failedOutput?.test(outcome.output)) return [];
		const url = URL_PATTERNS[rule.kind]?.exec(outcome.output)?.[0];
		return [
			{
				kind: rule.kind,
				command: command.length > MAX_COMMAND_CHARS ? `${command.slice(0, MAX_COMMAND_CHARS)}…` : command,
				cwd: outcome.cwd,
				...(url === undefined ? {} : { url }),
			},
		];
	});
}

export function milestoneKey(milestone: Milestone): string {
	return `${milestone.kind}:${milestone.url ?? `${milestone.cwd}:${milestone.command}`}`;
}

/** Appends milestones not already present, keeping first-seen order. */
export function mergeMilestones(existing: readonly Milestone[], found: readonly Milestone[]): readonly Milestone[] {
	const seen = new Set(existing.map(milestoneKey));
	const fresh = found.filter((milestone) => {
		const key = milestoneKey(milestone);
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
	return fresh.length === 0 ? existing : [...existing, ...fresh];
}

const KIND_LABELS: Readonly<Record<MilestoneKind, string>> = {
	push: "pushed",
	pr_opened: "opened PR",
	pr_merged: "merged PR",
	release: "published release",
};

export function describeMilestone(milestone: Milestone): string {
	const target = milestone.url ?? `\`${milestone.command}\``;
	return `${KIND_LABELS[milestone.kind]}: ${target} (in ${milestone.cwd})`;
}
