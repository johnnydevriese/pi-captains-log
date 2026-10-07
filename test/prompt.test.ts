import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LogbookConfig } from "../src/config.ts";
import { buildLogPrompt, dailyLogPath } from "../src/prompt.ts";

const config: LogbookConfig = { vaultPath: "/vault", dailyDir: "Daily Log", researchDir: "Research", git: "push" };

describe("dailyLogPath", () => {
	it("files late-night work under the local calendar day, not the UTC day", () => {
		// 23:30 local on Oct 7 is already Oct 8 in UTC for any zone west of UTC.
		const lateNight = new Date(2026, 9, 7, 23, 30);
		assert.equal(dailyLogPath(config, lateNight), "/vault/Daily Log/2026-10-07.md");
	});
});

describe("buildLogPrompt", () => {
	const now = new Date(2026, 9, 7, 9, 5);

	it("hands the agent the file, heading, milestones and note", () => {
		const prompt = buildLogPrompt({
			config,
			milestones: [{ kind: "pr_opened", command: "gh pr create", cwd: "/repo", target: "https://github.com/a/b/pull/7" }],
			note: "  finished the eval  ",
			now,
		});
		assert.ok(prompt.includes("/vault/Daily Log/2026-10-07.md"));
		assert.ok(prompt.includes("## 09:05"));
		assert.ok(prompt.includes("https://github.com/a/b/pull/7"));
		assert.ok(prompt.includes("finished the eval"));
	});

	it("asks for a push only under the push policy", () => {
		const prompt = (git: LogbookConfig["git"]) => buildLogPrompt({ config: { ...config, git }, milestones: [], note: "", now });
		assert.match(prompt("push"), /then push/);
		assert.doesNotMatch(prompt("commit"), /then push/);
		assert.doesNotMatch(prompt("off"), /commit only/);
	});
});
