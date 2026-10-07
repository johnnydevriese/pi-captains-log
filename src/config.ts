import { mkdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";

export type GitPolicy = "off" | "commit" | "push";

export interface LogbookConfig {
	readonly vaultPath: string;
	/** Vault-relative folder for `YYYY-MM-DD.md` daily logs. */
	readonly dailyDir: string;
	/** Vault-relative folder for new research notes. */
	readonly researchDir: string;
	readonly git: GitPolicy;
}

export class LogbookConfigError extends Error {
	override name = "LogbookConfigError";
}

const GIT_POLICIES: Readonly<Record<GitPolicy, true>> = { off: true, commit: true, push: true };

function isGitPolicy(value: string): value is GitPolicy {
	return Object.hasOwn(GIT_POLICIES, value);
}

function expandHome(path: string): string {
	if (path === "~") return homedir();
	return path.startsWith("~/") ? join(homedir(), path.slice(2)) : path;
}

function vaultFolder(env: Readonly<Record<string, string | undefined>>, variable: string, fallback: string): string {
	const folder = env[variable]?.trim() || fallback;
	if (isAbsolute(folder) || folder.split(/[\\/]/).includes("..")) {
		throw new LogbookConfigError(`${variable} must be a path inside the vault, got "${folder}".`);
	}
	return folder;
}

export function loadConfig(env: Readonly<Record<string, string | undefined>> = process.env): LogbookConfig {
	const rawVault = env.PI_LOGBOOK_VAULT?.trim();
	if (!rawVault) {
		throw new LogbookConfigError("PI_LOGBOOK_VAULT is not set. Point it at your notes vault directory.");
	}
	const vaultPath = expandHome(rawVault);
	if (!isAbsolute(vaultPath)) {
		throw new LogbookConfigError(`PI_LOGBOOK_VAULT must be an absolute path or start with ~/, got "${rawVault}".`);
	}
	let isDirectory: boolean;
	try {
		isDirectory = statSync(vaultPath).isDirectory();
	} catch (error) {
		throw new LogbookConfigError(`Logbook vault not found: ${vaultPath}`, { cause: error });
	}
	if (!isDirectory) {
		throw new LogbookConfigError(`Logbook vault is not a directory: ${vaultPath}`);
	}

	const dailyDir = vaultFolder(env, "PI_LOGBOOK_DAILY_DIR", "Daily Log");
	const researchDir = vaultFolder(env, "PI_LOGBOOK_RESEARCH_DIR", "Research");

	const git = env.PI_LOGBOOK_GIT?.trim() || "commit";
	if (!isGitPolicy(git)) {
		throw new LogbookConfigError(`PI_LOGBOOK_GIT must be one of off, commit, push; got "${git}".`);
	}

	return { vaultPath, dailyDir, researchDir, git };
}

/** Creates the logbook's folders inside an existing vault; folders that already exist are left alone. */
export function ensureVaultFolders(config: LogbookConfig): void {
	for (const folder of [config.dailyDir, config.researchDir]) {
		mkdirSync(join(config.vaultPath, folder), { recursive: true });
	}
}
