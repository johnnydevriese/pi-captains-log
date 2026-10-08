import { join } from "node:path";
import type { CaptainsLogConfig } from "./config.ts";
import { describeMilestone, type Milestone } from "./milestones.ts";

export interface LogRequest {
	readonly config: CaptainsLogConfig;
	readonly milestones: readonly Milestone[];
	readonly note: string;
	readonly now: Date;
}

const GIT_INSTRUCTIONS: Readonly<Record<CaptainsLogConfig["git"], string>> = {
	off: "Do not run git in the vault.",
	commit: "If the vault is a git repository, commit only the notes you changed. Do not push.",
	push: "If the vault is a git repository, commit only the notes you changed, then push.",
};

function pad(value: number): string {
	return String(value).padStart(2, "0");
}

/** Local calendar date: a daily log follows the author's day, not UTC. */
export function localDate(now: Date): string {
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function dailyLogPath(config: CaptainsLogConfig, now: Date): string {
	return join(config.vaultPath, config.folders.daily, `${localDate(now)}.md`);
}

export function buildLogPrompt(request: LogRequest): string {
	const { config, milestones, note, now } = request;
	const milestoneLines =
		milestones.length === 0
			? ["- none detected. That is normal for research, discussion or debugging; the session itself is the source."]
			: milestones.map((milestone) => `- ${describeMilestone(milestone)}`);
	const trimmedNote = note.trim();

	return [
		"Update my captain's log. Follow the `captains-log` skill.",
		"",
		"The deliverable is a session note that lets me pick this work up weeks from now without redoing the investigation or repeating this conversation. A daily log entry that links to it comes second.",
		...(trimmedNote === "" ? [] : ["", `My note on scope or emphasis: ${trimmedNote}`]),
		"",
		"Source: what happened in this conversation since the last log entry: what we discussed, read, ran and concluded, plus tool output and files touched. Bring forward earlier context only when the new work can't be understood without it; don't re-log work an earlier entry already covers.",
		"",
		"1. Session note (primary). Before writing, search the vault for an existing note on this topic. If one exists, append a dated section and leave its earlier content as written. Otherwise create one with the research-note template, filed by the skill's rules in the best-fit existing domain or topic folder, matching the conventions already in the vault. Capture what applies:",
		"   - the problem or goal, and the constraints that shaped it",
		"   - the understanding reached and the findings, stated as conclusions",
		"   - decisions and why; alternatives ruled out and dead ends, with the reason each failed so I don't retry them",
		"   - verification actually observed (commands, measurements, outputs), kept separate from hypotheses and unverified assumptions, with remaining uncertainty stated",
		"   - exact references worth keeping: paths, commands, identifiers, links",
		"   - current state and the concrete next action",
		"   Write only what the session supports. If part of this context is not available to you, say so in the note instead of filling it in. No transcript dumps, generic filler or secrets.",
		"",
		`2. Daily log (secondary): ${dailyLogPath(config, now)}. Append under a \`## ${pad(now.getHours())}:${pad(now.getMinutes())}\` heading (create the file if missing): a line or two of context and a link to the session note.`,
		"",
		`Vault: ${config.vaultPath}`,
		"Vault folders (the skill says what goes where):",
		...Object.entries(config.folders).map(([role, folder]) => `- ${role}: ${folder}/`),
		"",
		"Git milestones detected since the last log entry. These are references to cite where relevant, not a list of what to cover:",
		...milestoneLines,
		"",
		GIT_INSTRUCTIONS[config.git],
		"When done, show me the session note's bottom line and resumption point, and every path you wrote.",
	].join("\n");
}
