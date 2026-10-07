import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LogbookConfig } from "../src/config.ts";
import { buildLogPrompt, dailyLogPath } from "../src/prompt.ts";

const config: LogbookConfig = { vaultPath: "/vault", dailyDir: "Daily Log", git: "push" };

describe("dailyLogPath", () => {
	it("files late-night work under the local calendar day, not the UTC day", () => {
		// 23:30 local on Oct 7 is already Oct 8 in UTC for any zone west of UTC.
		const lateNight = new Date(2026, 9, 7, 23, 30);
		assert.equal(dailyLogPath(config, lateNight), "/vault/Daily Log/2026-10-07.md");
	});
});

describe("buildLogPrompt", () => {
	const now = new Date(2026, 9, 7, 9, 5);

	it("hands the agent the file, heading, milestones, note and git policy", () => {
		const prompt = buildLogPrompt({
			config,
			milestones: [{ kind: "pr_opened", command: "gh pr create", cwd: "/repo", url: "https://github.com/a/b/pull/7" }],
			note: "  finished the eval  ",
			now,
		});
		assert.match(prompt, /Daily log: \/vault\/Daily Log\/2026-10-07\.md \(append under a `## 09:05` heading/);
		assert.match(prompt, /- opened PR: https:\/\/github\.com\/a\/b\/pull\/7 \(in \/repo\)/);
		assert.match(prompt, /My note: finished the eval\n/);
		assert.match(prompt, /commit only the notes you changed, then push/);
	});

	it("never asks to push when the policy is commit", () => {
		const prompt = buildLogPrompt({ config: { ...config, git: "commit" }, milestones: [], note: "", now });
		assert.match(prompt, /Do not push\./);
		assert.doesNotMatch(prompt, /My note/);
	});
});
