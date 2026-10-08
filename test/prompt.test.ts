import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CaptainsLogConfig } from "../src/config.ts";
import { dailyLogPath } from "../src/prompt.ts";

const config: CaptainsLogConfig = {
	vaultPath: "/vault",
	folders: {
		inbox: "Inbox",
		daily: "Daily Log",
		projects: "Projects",
		research: "Research",
		meetings: "Meetings",
		career: "Career",
		archive: "Archive",
	},
	git: "push",
};

describe("dailyLogPath", () => {
	it("files late-night work under the local calendar day, not the UTC day", () => {
		// 23:30 local on Oct 7 is already Oct 8 in UTC for any zone west of UTC.
		const lateNight = new Date(2026, 9, 7, 23, 30);
		assert.equal(dailyLogPath(config, lateNight), "/vault/Daily Log/2026-10-07.md");
	});
});
