import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { ensureVaultFolders, CaptainsLogConfigError, loadConfig } from "../src/config.ts";

const vault = mkdtempSync(join(tmpdir(), "pi-captains-log-vault-"));

describe("loadConfig", () => {
	it("defaults the folders and git policy", () => {
		assert.deepEqual(loadConfig({ PI_CAPTAINS_LOG_VAULT: vault }), {
			vaultPath: vault,
			dailyDir: "Daily Log",
			researchDir: "Research",
			git: "commit",
		});
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
	it("creates missing nested folders and keeps existing notes", () => {
		const fresh = mkdtempSync(join(tmpdir(), "pi-captains-log-fresh-"));
		mkdirSync(join(fresh, "Research"));
		writeFileSync(join(fresh, "Research", "existing.md"), "# kept\n");
		const config = loadConfig({ PI_CAPTAINS_LOG_VAULT: fresh, PI_CAPTAINS_LOG_DAILY_DIR: "05 Logs/Daily" });

		ensureVaultFolders(config);
		ensureVaultFolders(config);

		assert.ok(existsSync(join(fresh, "05 Logs", "Daily")));
		assert.deepEqual(readdirSync(join(fresh, "Research")), ["existing.md"]);
	});
});
