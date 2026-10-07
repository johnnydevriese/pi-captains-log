import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { ensureVaultFolders, type CaptainsLogConfig, CaptainsLogConfigError, loadConfig } from "../../src/config.ts";
import {
	describeMilestone,
	detectMilestones,
	type Milestone,
	mergeMilestones,
	milestoneKey,
	milestonesToOffer,
} from "../../src/milestones.ts";
import { buildLogPrompt } from "../../src/prompt.ts";

const RECORD = "Make it so";
const LATER = "Not now";
const MUTE = "Stop asking this session (/log still works)";

export default function captainsLog(pi: ExtensionAPI): void {
	// Milestones since the last log entry, and the keys already offered so each one prompts once.
	let pending: readonly Milestone[] = [];
	let offered: ReadonlySet<string> = new Set();
	// True while the agent is writing an entry: its own vault commit/push must not become a new milestone.
	let writingEntry = false;
	// Set by "Stop asking this session"; /log still works.
	let muted = false;

	const reset = (): void => {
		pending = [];
		offered = new Set();
	};

	const requestEntry = (ctx: ExtensionContext, note: string): void => {
		let config: CaptainsLogConfig;
		try {
			config = loadConfig();
			ensureVaultFolders(config);
		} catch (error) {
			if (!(error instanceof CaptainsLogConfigError)) throw error;
			ctx.ui.notify(error.message, "error");
			return;
		}

		const prompt = buildLogPrompt({ config, milestones: pending, note, now: new Date() });
		pi.sendUserMessage(prompt, ctx.isIdle() ? undefined : { deliverAs: "followUp" });
		reset();
		writingEntry = true;
	};

	pi.on("session_start", () => {
		reset();
		writingEntry = false;
		muted = false;
	});

	pi.on("tool_result", (event, ctx) => {
		if (writingEntry || event.toolName !== "bash" || typeof event.input.command !== "string") return;
		const output = event.content.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n");
		const found = detectMilestones({
			command: event.input.command,
			output,
			isError: event.isError,
			cwd: typeof event.input.cwd === "string" ? event.input.cwd : ctx.cwd,
		});
		pending = mergeMilestones(pending, found);
	});

	pi.on("agent_end", (_event, ctx) => {
		if (writingEntry) {
			writingEntry = false;
			return;
		}
		if (muted || !ctx.hasUI) return;
		const fresh = milestonesToOffer(pending, offered);
		if (fresh.length === 0) return;
		offered = new Set([...offered, ...fresh.map(milestoneKey)]);

		// Not awaited: a dialog can outlive the host's event-handler budget. A detached promise must never
		// reject unhandled, because that can take down the host process.
		const summary = fresh.map(describeMilestone).join("\n");
		const count = fresh.length === 1 ? "1 milestone" : `${fresh.length} milestones`;
		ctx.ui
			.select(`Captain's log: ${count} since the last entry. Record now?\n${summary}`, [RECORD, LATER, MUTE])
			.then((choice) => {
				if (choice === RECORD) requestEntry(ctx, "");
				if (choice === MUTE) muted = true;
			})
			.catch((error: unknown) => {
				try {
					ctx.ui.notify(`Captain's log prompt failed: ${error instanceof Error ? error.message : String(error)}`, "error");
				} catch {
					// The session was reloaded or replaced while the dialog was open; there is nowhere left to report to.
				}
			});
	});

	pi.registerCommand("log", {
		description: "Record a captain's log entry for this session (optional note)",
		handler: async (args, ctx) => requestEntry(ctx, args),
	});
}
