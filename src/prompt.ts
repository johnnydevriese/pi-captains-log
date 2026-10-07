import { join } from "node:path";
import type { LogbookConfig } from "./config.ts";
import { describeMilestone, type Milestone } from "./milestones.ts";

export interface LogRequest {
	readonly config: LogbookConfig;
	readonly milestones: readonly Milestone[];
	readonly note: string;
	readonly now: Date;
}

const GIT_INSTRUCTIONS: Readonly<Record<LogbookConfig["git"], string>> = {
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

export function dailyLogPath(config: LogbookConfig, now: Date): string {
	return join(config.vaultPath, config.dailyDir, `${localDate(now)}.md`);
}

export function buildLogPrompt(request: LogRequest): string {
	const { config, milestones, note, now } = request;
	const milestoneLines =
		milestones.length === 0
			? ["- none detected; use the session itself"]
			: milestones.map((milestone) => `- ${describeMilestone(milestone)}`);
	const trimmedNote = note.trim();

	return [
		"Update my logbook. Follow the `logbook` skill.",
		"",
		`Vault: ${config.vaultPath}`,
		`Daily log: ${dailyLogPath(config, now)} (append under a \`## ${pad(now.getHours())}:${pad(now.getMinutes())}\` heading; create the file if missing)`,
		"",
		"Milestones detected since the last logbook entry:",
		...milestoneLines,
		...(trimmedNote === "" ? [] : ["", `My note: ${trimmedNote}`]),
		"",
		"Cover the work done since the last logbook entry in this session. If it produced evidence worth keeping (measurements, decisions, exact identifiers), also write or update a research note and link it from the daily entry.",
		GIT_INSTRUCTIONS[config.git],
		"When done, show me the daily entry and the paths you wrote.",
	].join("\n");
}
