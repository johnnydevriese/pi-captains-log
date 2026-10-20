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

/** Local calendar date (`YYYY-MM-DD`): note filenames and dated update sections follow the author's day, not UTC. */
export function localDate(now: Date): string {
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	return `${now.getFullYear()}-${month}-${day}`;
}

export function buildLogPrompt(request: LogRequest): string {
	const { config, milestones, note, now } = request;
	const today = localDate(now);
	const milestoneLines =
		milestones.length === 0
			? ["- none detected. That is normal for planning, research, discussion or debugging; the session itself is the source."]
			: milestones.map((milestone) => `- ${describeMilestone(milestone)}`);
	const trimmedNote = note.trim();

	return [
		"Update my captain's log. Follow the `captains-log` skill.",
		"",
		"The deliverable is ONE living topic or project note in my vault (created or updated in place) that crystallizes this session so a future session can pick the work up cold without redoing the investigation or repeating the conversation. Do NOT create or append to a separate daily log file unless I explicitly ask for one.",
		...(trimmedNote === "" ? [] : ["", `My note on scope or emphasis: ${trimmedNote}`]),
		"",
		"Source: what happened in this conversation since the last log entry: what we discussed, read, ran, decided and verified, plus tool output and files touched. Bring forward earlier context only when the new work can't be understood without it; don't re-log work an earlier entry already covers.",
		"",
		`1. Search before writing. Look for an existing vault note on the same ticket, PR, repo or topic, and inspect the nested subfolders under \`${config.folders.projects}/\` and \`${config.folders.research}/\` to see where related notes live.`,
		`2. Update or create one note (date: ${today}):`,
		`   - If an existing note covers this work, append a dated section (\`## Update ${today}: <milestone or change>\`) and update its top \`Status:\` line if the state changed. Leave earlier text intact; if implementation or testing disproved part of the earlier plan, add a "Corrections to the plan above:" list in the update section.`,
		"   - Otherwise create ONE note in the best-fit existing nested subfolder (e.g. `<projects>/<Area>/<Subfolder>/`), using headings that fit the work mode (plan, investigation, evaluation, review or research note) rather than forcing boilerplate.",
		"3. Capture the four load-bearing pillars that apply:",
		"   - What we were trying to accomplish, and the constraints that shaped it",
		"   - What we changed, decided or discovered, and why (mechanisms, code paths, and alternatives ruled out with the reason each failed so we don't retry them)",
		"   - What we actually verified (tables of measurements/counts, exact commands/queries, ticket IDs, PR/commit links, run IDs), kept strictly separate from `[INFERENCE]` or unverified assumptions",
		"   - What is unfinished or open, and the concrete first step when resuming",
		"   Write only what the session supports. If part of the context is unavailable, state that in the note instead of guessing. No transcript dumps, generic filler or secrets.",
		"",
		`Vault: ${config.vaultPath}`,
		"Top-level vault folders (file inside existing nested domain subfolders where they exist):",
		...Object.entries(config.folders).map(([role, folder]) => `- ${role}: ${folder}/`),
		"",
		"Git milestones detected since the last log entry. These are references to cite where relevant, not a list of what to cover:",
		...milestoneLines,
		"",
		GIT_INSTRUCTIONS[config.git],
		"When done, show me the note's status, resumption point, and the exact path you wrote.",
	].join("\n");
}
