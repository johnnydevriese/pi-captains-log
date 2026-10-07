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

const kinds = (outcome: Partial<BashOutcome>) => detectMilestones(bash(outcome)).map((m) => m.kind);

describe("detectMilestones", () => {
	it("records a push with the refs it updated", () => {
		const [push] = detectMilestones(bash({ command: "cd repo && git push", output: "   de62b69..fc92733  main -> main\n" }));
		assert.equal(push?.kind, "push");
		assert.equal(push?.target, "de62b69..fc92733 main -> main");
	});

	it("recognizes pushes behind git -C and env prefixes", () => {
		assert.deepEqual(kinds({ command: "git -C ~/vault push" }), ["push"]);
		assert.deepEqual(kinds({ command: "GIT_SSH_COMMAND='ssh -i k' git push origin main" }), ["push"]);
	});

	it("ignores pushes that did nothing, even when the pipeline exited 0", () => {
		const rejected = " ! [remote rejected] main -> main (Internal Server Error)\nerror: failed to push some refs";
		assert.deepEqual(kinds({ command: "git push 2>&1 | tail -2", output: rejected }), []);
		assert.deepEqual(kinds({ command: "git push", output: "Everything up-to-date" }), []);
		assert.deepEqual(kinds({ command: "git push --dry-run origin main" }), []);
		assert.deepEqual(kinds({ command: "git push", isError: true }), []);
	});

	it("ignores commands that only mention a milestone", () => {
		assert.deepEqual(kinds({ command: 'git commit -m "retry git push on 5xx"' }), []);
		assert.deepEqual(kinds({ command: "echo next: gh pr create" }), []);
		assert.deepEqual(kinds({ command: "cat <<'EOF' > notes.md\nthen git push\nEOF" }), []);
	});

	it("finds every milestone in a chained command and attaches the PR URL", () => {
		const found = detectMilestones(
			bash({
				command: "git push -u origin feat && gh pr create --fill",
				output: " * [new branch]      feat -> feat\nhttps://github.com/acme/widgets/pull/42\n",
			}),
		);
		assert.deepEqual(
			found.map((m) => [m.kind, m.target]),
			[
				["push", "[new branch] feat -> feat"],
				["pr_opened", "https://github.com/acme/widgets/pull/42"],
			],
		);
	});

	it("does not report an existing PR, a dry run or an auto-merge request as done", () => {
		const existing = 'a pull request for branch "feat" into branch "main" already exists:\nhttps://github.com/acme/widgets/pull/7';
		assert.deepEqual(kinds({ command: "gh pr create --fill 2>&1 | tail -2", output: existing }), []);
		assert.deepEqual(kinds({ command: "gh pr create --fill --dry-run", output: "Would have created a Pull Request" }), []);
		assert.deepEqual(kinds({ command: "gh pr merge 7 --auto --squash" }), []);
	});
});

describe("mergeMilestones", () => {
	const pr: Milestone = { kind: "pr_opened", command: "gh pr create", cwd: "/a", target: "https://github.com/a/b/pull/1" };

	it("keeps one entry per PR even when created from different commands", () => {
		const again: Milestone = { ...pr, command: "gh pr create --fill" };
		assert.deepEqual(mergeMilestones([pr], [again]), [pr]);
	});

	it("treats a later push of new commits as a new milestone", () => {
		const first: Milestone = { kind: "push", command: "git push", cwd: "/a", target: "aaaaaaa..bbbbbbb main -> main" };
		const second: Milestone = { ...first, target: "bbbbbbb..ccccccc main -> main" };
		assert.deepEqual(mergeMilestones([first], [second]), [first, second]);
	});

	it("keeps pushes in different repositories apart", () => {
		const pushA: Milestone = { kind: "push", command: "git push", cwd: "/a" };
		const pushB: Milestone = { kind: "push", command: "git push", cwd: "/b" };
		assert.deepEqual(mergeMilestones([pushA], [pushB, pushA]), [pushA, pushB]);
	});
});
