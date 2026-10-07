export type MilestoneKind = "push" | "pr_opened" | "pr_merged" | "release";

export interface Milestone {
	readonly kind: MilestoneKind;
	readonly command: string;
	readonly cwd: string;
	/** What the milestone points at: a PR or release URL, or the ref updates a push made. */
	readonly target?: string;
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
	/** Command flags that make the step a rehearsal or a deferral rather than the real thing. */
	readonly excludeCommand?: RegExp;
	/** Output showing nothing happened, even though the shell exited 0 (e.g. `git push ... | tail`). */
	readonly noopOutput: RegExp;
	/** Extracts the target from output; when `targetRequired`, no target means no milestone. */
	readonly target: (output: string) => string | undefined;
	readonly targetRequired: boolean;
}

// A command word only counts at the start of a shell segment, optionally after VAR=value prefixes,
// so `echo git push` or `cd repo && git log` never match.
const SEGMENT_START = String.raw`(?:^|[;&|(\n])\s*(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)*`;

const PR_URL = /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/;
const RELEASE_URL = /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/releases\/tag\/\S+/;
// `   de62b69..fc92733  main -> main`, ` * [new branch]  feat -> feat`, ` + 1a2b3c4...5d6e7f8 x -> x (forced update)`
const PUSHED_REF = /^\s*[ +*]?\s*([0-9a-f]{7,}\.{2,3}[0-9a-f]{7,}|\[new (?:branch|tag)\])\s+(\S+\s+->\s+\S+)/gm;

const RULES: readonly Rule[] = [
	{
		kind: "push",
		pattern: new RegExp(String.raw`${SEGMENT_START}git\s+(?:-C\s+\S+\s+)?push\b`),
		excludeCommand: /\s(?:--dry-run|-n)\b/,
		noopOutput: /\[(?:remote )?rejected\]|error: failed to push|fatal:|Everything up-to-date/,
		target: (output) => {
			const refs = [...output.matchAll(PUSHED_REF)].map((match) => `${match[1]} ${match[2]}`);
			return refs.length === 0 ? undefined : refs.join(", ");
		},
		targetRequired: false,
	},
	{
		kind: "pr_opened",
		pattern: new RegExp(String.raw`${SEGMENT_START}gh\s+pr\s+create\b`),
		excludeCommand: /\s--dry-run\b/,
		noopOutput: /already exists|GraphQL: |failed to create|must first push/i,
		target: (output) => PR_URL.exec(output)?.[0],
		targetRequired: true,
	},
	{
		kind: "pr_merged",
		pattern: new RegExp(String.raw`${SEGMENT_START}gh\s+pr\s+merge\b`),
		excludeCommand: /\s--auto\b/,
		noopOutput: /not mergeable|failed to merge|GraphQL: |will be automatically merged|already merged/i,
		target: (output) => PR_URL.exec(output)?.[0],
		targetRequired: false,
	},
	{
		kind: "release",
		pattern: new RegExp(String.raw`${SEGMENT_START}gh\s+release\s+create\b`),
		noopOutput: /GraphQL: |HTTP 4\d\d|already exists/,
		target: (output) => RELEASE_URL.exec(output)?.[0],
		targetRequired: false,
	},
];

const MAX_COMMAND_CHARS = 300;

/** Blanks heredoc bodies and quoted strings so prose inside them (commit messages, echo text) never matches. */
function withoutQuotedText(command: string): string {
	return command
		.replace(/<<-?\s*(['"]?)(\w+)\1[^\n]*\n[\s\S]*?\n\s*\2\b/g, "<<heredoc")
		.replace(/'[^']*'/g, "''")
		.replace(/"(?:[^"\\]|\\.)*"/g, '""');
}

/** Milestones a successful bash call reached. Failed calls, and calls whose output shows nothing happened, reach none. */
export function detectMilestones(outcome: BashOutcome): readonly Milestone[] {
	if (outcome.isError) return [];
	const command = outcome.command.trim();
	const code = withoutQuotedText(command);
	return RULES.flatMap((rule): Milestone[] => {
		if (!rule.pattern.test(code) || rule.excludeCommand?.test(code) || rule.noopOutput.test(outcome.output)) return [];
		const target = rule.target(outcome.output);
		if (target === undefined && rule.targetRequired) return [];
		return [
			{
				kind: rule.kind,
				command: command.length > MAX_COMMAND_CHARS ? `${command.slice(0, MAX_COMMAND_CHARS)}…` : command,
				cwd: outcome.cwd,
				...(target === undefined ? {} : { target }),
			},
		];
	});
}

export function milestoneKey(milestone: Milestone): string {
	return `${milestone.kind}:${milestone.cwd}:${milestone.target ?? milestone.command}`;
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
	const target = milestone.target ?? `\`${milestone.command}\``;
	return `${KIND_LABELS[milestone.kind]}: ${target} (in ${milestone.cwd})`;
}
