import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { type BashOutcome, detectMilestones, type Milestone, mergeMilestones } from "../src/milestones.ts";

const bash = (overrides: Partial<BashOutcome>): BashOutcome => ({
	command: "",
	output: "",
	isError: false,
	cwd: "/repo",
	...overrides,
});

describe("detectMilestones", () => {
	it("records a successful push", () => {
		const found = detectMilestones(bash({ command: "git push origin main", output: "   de62b69..fc92733  main -> main" }));
		assert.deepEqual(
			found.map((m) => m.kind),
			["push"],
		);
	});

	it("ignores a rejected push even when the pipeline exited 0", () => {
		const output = " ! [remote rejected] main -> main (Internal Server Error)\nerror: failed to push some refs";
		assert.deepEqual(detectMilestones(bash({ command: "git push 2>&1 | tail -2", output })), []);
	});

	it("ignores dry-run pushes and failed tool calls", () => {
		assert.deepEqual(detectMilestones(bash({ command: "git push --dry-run origin main" })), []);
		assert.deepEqual(detectMilestones(bash({ command: "git push", isError: true })), []);
	});

	it("does not mistake other commands that mention push", () => {
		assert.deepEqual(detectMilestones(bash({ command: "git log --grep push && echo git-push" })), []);
	});

	it("finds every milestone in a chained command and attaches the PR URL", () => {
		const found = detectMilestones(
			bash({
				command: "git push -u origin feat && gh pr create --fill",
				output: "branch 'feat' set up to track\nhttps://github.com/acme/widgets/pull/42\n",
			}),
		);
		assert.deepEqual(
			found.map((m) => [m.kind, m.url]),
			[
				["push", undefined],
				["pr_opened", "https://github.com/acme/widgets/pull/42"],
			],
		);
	});
});

describe("mergeMilestones", () => {
	const pr: Milestone = { kind: "pr_opened", command: "gh pr create", cwd: "/a", url: "https://github.com/a/b/pull/1" };

	it("keeps one entry per PR even when created from different commands", () => {
		const again: Milestone = { ...pr, command: "gh pr create --fill" };
		assert.deepEqual(mergeMilestones([pr], [again]), [pr]);
	});

	it("keeps pushes in different repositories apart", () => {
		const pushA: Milestone = { kind: "push", command: "git push", cwd: "/a" };
		const pushB: Milestone = { kind: "push", command: "git push", cwd: "/b" };
		assert.deepEqual(mergeMilestones([pushA], [pushB, pushA]), [pushA, pushB]);
	});
});
