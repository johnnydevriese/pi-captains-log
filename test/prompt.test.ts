import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CaptainsLogConfig } from "../src/config.ts";
import { buildLogPrompt, localDate } from "../src/prompt.ts";

const config: CaptainsLogConfig = {
	vaultPath: "/vault",
	folders: {
		inbox: "Inbox",
		projects: "Projects",
		research: "Research",
		meetings: "Meetings",
		career: "Career",
		archive: "Archive",
	},
	git: "push",
};

describe("localDate", () => {
	it("uses the local calendar day, not the UTC day, for late-night work", () => {
		// 23:30 local on Oct 7 is already Oct 8 in UTC for any zone west of UTC.
		const lateNight = new Date(2026, 9, 7, 23, 30);
		assert.equal(localDate(lateNight), "2026-10-07");
	});
});

describe("buildLogPrompt", () => {
	it("requests a single living vault note with the four pillars and no separate daily log", () => {
		const prompt = buildLogPrompt({
			config,
			milestones: [
				{
					kind: "pr_opened",
					command: "gh pr create --fill",
					cwd: "/repo/widgets",
					target: "https://github.com/acme/widgets/pull/42",
				},
			],
			note: "focus on the CSV quote parser decision",
			now: new Date(2026, 9, 7, 23, 30),
		});

		assert.match(prompt, /ONE living topic or project note/);
		assert.match(prompt, /Do NOT create or append to a separate daily log file/);
		assert.match(prompt, /focus on the CSV quote parser decision/);
		assert.match(prompt, /## Update 2026-10-07:/);
		assert.match(prompt, /Corrections to the plan above:/);
		assert.match(prompt, /https:\/\/github\.com\/acme\/widgets\/pull\/42/);
		assert.match(prompt, /commit only the notes you changed, then push/);
	});
});
