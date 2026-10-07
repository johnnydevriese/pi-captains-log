import { mkdirSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";

export type GitPolicy = "off" | "commit" | "push";

export type FolderRole = "inbox" | "daily" | "projects" | "research" | "meetings" | "career" | "archive";

export interface CaptainsLogConfig {
	readonly vaultPath: string;
	/** Vault-relative folder for each role, e.g. `{ daily: "05 Daily Log", ... }`. */
	readonly folders: Readonly<Record<FolderRole, string>>;
	readonly git: GitPolicy;
}

export class CaptainsLogConfigError extends Error {
	override name = "CaptainsLogConfigError";
}

const GIT_POLICIES: Readonly<Record<GitPolicy, true>> = { off: true, commit: true, push: true };

function isGitPolicy(value: string): value is GitPolicy {
	return Object.hasOwn(GIT_POLICIES, value);
}

interface FolderSpec {
	/** Environment variable that pins the folder exactly. */
	readonly variable: string;
	/** Created when the vault has no matching folder. Numbered so the layout sorts in reading order. */
	readonly fallback: string;
	/** Lowercase names an existing top-level folder may carry, after any number prefix such as `10 `. */
	readonly aliases: readonly string[];
}

// Record order is the layout's display order.
const FOLDER_SPECS: Readonly<Record<FolderRole, FolderSpec>> = {
	inbox: { variable: "PI_CAPTAINS_LOG_INBOX_DIR", fallback: "00 Inbox", aliases: ["inbox"] },
	daily: { variable: "PI_CAPTAINS_LOG_DAILY_DIR", fallback: "05 Daily Log", aliases: ["daily log", "daily notes", "daily", "journal"] },
	projects: { variable: "PI_CAPTAINS_LOG_PROJECTS_DIR", fallback: "10 Projects", aliases: ["projects"] },
	research: { variable: "PI_CAPTAINS_LOG_RESEARCH_DIR", fallback: "20 Research", aliases: ["research"] },
	meetings: { variable: "PI_CAPTAINS_LOG_MEETINGS_DIR", fallback: "30 Meetings", aliases: ["meetings", "meeting notes"] },
	career: { variable: "PI_CAPTAINS_LOG_CAREER_DIR", fallback: "40 Career", aliases: ["career"] },
	archive: { variable: "PI_CAPTAINS_LOG_ARCHIVE_DIR", fallback: "90 Archive", aliases: ["archive", "archives"] },
};

const NUMBER_PREFIX = /^\d+\s*[-._]?\s*/;

function expandHome(path: string): string {
	if (path === "~") return homedir();
	return path.startsWith("~/") ? join(homedir(), path.slice(2)) : path;
}

function pinnedFolder(variable: string, folder: string): string {
	if (isAbsolute(folder) || folder.split(/[\\/]/).includes("..")) {
		throw new CaptainsLogConfigError(`${variable} must be a path inside the vault, got "${folder}".`);
	}
	return folder;
}

/** Pinned folder if set; else an existing top-level folder matching an alias (`Projects`, `10 Projects`); else the fallback. */
function resolveFolders(env: Readonly<Record<string, string | undefined>>, topLevel: readonly string[]): Record<FolderRole, string> {
	const sorted = topLevel.toSorted();
	const entries = Object.entries(FOLDER_SPECS).map(([role, spec]) => {
		const pinned = env[spec.variable]?.trim();
		if (pinned) return [role, pinnedFolder(spec.variable, pinned)];
		const existing = sorted.find((name) => spec.aliases.includes(name.replace(NUMBER_PREFIX, "").toLowerCase()));
		return [role, existing ?? spec.fallback];
	});
	return Object.fromEntries(entries) as Record<FolderRole, string>;
}

export function loadConfig(env: Readonly<Record<string, string | undefined>> = process.env): CaptainsLogConfig {
	const rawVault = env.PI_CAPTAINS_LOG_VAULT?.trim();
	if (!rawVault) {
		throw new CaptainsLogConfigError("PI_CAPTAINS_LOG_VAULT is not set. Point it at your notes vault directory.");
	}
	const vaultPath = expandHome(rawVault);
	if (!isAbsolute(vaultPath)) {
		throw new CaptainsLogConfigError(`PI_CAPTAINS_LOG_VAULT must be an absolute path or start with ~/, got "${rawVault}".`);
	}
	let isDirectory: boolean;
	try {
		isDirectory = statSync(vaultPath).isDirectory();
	} catch (error) {
		throw new CaptainsLogConfigError(`Vault not found: ${vaultPath}`, { cause: error });
	}
	if (!isDirectory) {
		throw new CaptainsLogConfigError(`Vault is not a directory: ${vaultPath}`);
	}

	const topLevel = readdirSync(vaultPath, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? [entry.name] : []));
	const folders = resolveFolders(env, topLevel);

	const git = env.PI_CAPTAINS_LOG_GIT?.trim() || "commit";
	if (!isGitPolicy(git)) {
		throw new CaptainsLogConfigError(`PI_CAPTAINS_LOG_GIT must be one of off, commit, push; got "${git}".`);
	}

	return { vaultPath, folders, git };
}

/** Creates any missing layout folders inside an existing vault; existing folders and notes are left alone. */
export function ensureVaultFolders(config: CaptainsLogConfig): void {
	for (const folder of Object.values(config.folders)) {
		mkdirSync(join(config.vaultPath, folder), { recursive: true });
	}
}
