import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { ensureVaultFolders, CaptainsLogConfigError, loadConfig } from "../src/config.ts";

const vault = mkdtempSync(join(tmpdir(), "pi-captains-log-vault-"));

const freshVault = (...folders: string[]): string => {
	const path = mkdtempSync(join(tmpdir(), "pi-captains-log-vault-"));
	for (const folder of folders) mkdirSync(join(path, folder), { recursive: true });
	return path;
};

describe("loadConfig", () => {
	it("defaults to the numbered layout and commit policy for an empty vault", () => {
		assert.deepEqual(loadConfig({ PI_CAPTAINS_LOG_VAULT: vault }), {
			vaultPath: vault,
			folders: {
				inbox: "00 Inbox",
				daily: "05 Daily Log",
				projects: "10 Projects",
				research: "20 Research",
				meetings: "30 Meetings",
				career: "40 Career",
				archive: "90 Archive",
			},
			git: "commit",
		});
	});

	it("adopts the vault's existing folders, ignoring number prefixes and case", () => {
		const existing = freshVault("Projects", "2 - research", "Daily Notes", ".obsidian");
		const { folders } = loadConfig({ PI_CAPTAINS_LOG_VAULT: existing });
		assert.equal(folders.projects, "Projects");
		assert.equal(folders.research, "2 - research");
		assert.equal(folders.daily, "Daily Notes");
		assert.equal(folders.meetings, "30 Meetings");
	});

	it("lets an environment variable pin a folder over an existing match", () => {
		const existing = freshVault("Projects");
		const { folders } = loadConfig({ PI_CAPTAINS_LOG_VAULT: existing, PI_CAPTAINS_LOG_PROJECTS_DIR: "Work/Projects" });
		assert.equal(folders.projects, "Work/Projects");
	});

	it("expands ~ to the home directory", () => {
		assert.equal(loadConfig({ PI_CAPTAINS_LOG_VAULT: "~" }).vaultPath, homedir());
	});

	const rejected: ReadonlyArray<[string, Record<string, string>, RegExp]> = [
		["unset vault", {}, /PI_CAPTAINS_LOG_VAULT is not set/],
		["relative vault", { PI_CAPTAINS_LOG_VAULT: "notes" }, /absolute path/],
		["missing vault", { PI_CAPTAINS_LOG_VAULT: join(vault, "nope") }, /not found/],
		["daily folder escaping the vault", { PI_CAPTAINS_LOG_VAULT: vault, PI_CAPTAINS_LOG_DAILY_DIR: "../elsewhere" }, /inside the vault/],
		["research folder outside the vault", { PI_CAPTAINS_LOG_VAULT: vault, PI_CAPTAINS_LOG_RESEARCH_DIR: "/tmp/notes" }, /inside the vault/],
		["unknown git policy", { PI_CAPTAINS_LOG_VAULT: vault, PI_CAPTAINS_LOG_GIT: "force-push" }, /off, commit, push/],
	];
	for (const [name, env, message] of rejected) {
		it(`rejects ${name}`, () => {
			assert.throws(() => loadConfig(env), (error: unknown) => error instanceof CaptainsLogConfigError && message.test(error.message));
		});
	}

	it("rejects a vault path that is a file", () => {
		const file = join(vault, "note.md");
		writeFileSync(file, "# note\n");
		assert.throws(() => loadConfig({ PI_CAPTAINS_LOG_VAULT: file }), /not a directory/);
	});
});

describe("ensureVaultFolders", () => {
	it("creates the missing layout and keeps existing folders and notes", () => {
		const existing = freshVault("Research");
		writeFileSync(join(existing, "Research", "existing.md"), "# kept\n");
		const config = loadConfig({ PI_CAPTAINS_LOG_VAULT: existing });

		ensureVaultFolders(config);
		ensureVaultFolders(config);

		assert.deepEqual(readdirSync(existing).toSorted(), [
			"00 Inbox",
			"05 Daily Log",
			"10 Projects",
			"30 Meetings",
			"40 Career",
			"90 Archive",
			"Research",
		]);
		assert.deepEqual(readdirSync(join(existing, "Research")), ["existing.md"]);
	});
});
