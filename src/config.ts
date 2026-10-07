import { statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";

export type GitPolicy = "off" | "commit" | "push";

export interface LogbookConfig {
	readonly vaultPath: string;
	readonly dailyDir: string;
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

	const dailyDir = env.PI_LOGBOOK_DAILY_DIR?.trim() || "Daily Log";
	if (isAbsolute(dailyDir) || dailyDir.split(/[\\/]/).includes("..")) {
		throw new LogbookConfigError(`PI_LOGBOOK_DAILY_DIR must be a path inside the vault, got "${dailyDir}".`);
	}

	const git = env.PI_LOGBOOK_GIT?.trim() || "commit";
	if (!isGitPolicy(git)) {
		throw new LogbookConfigError(`PI_LOGBOOK_GIT must be one of off, commit, push; got "${git}".`);
	}

	return { vaultPath, dailyDir, git };
}
