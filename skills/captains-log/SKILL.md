---
name: captains-log
description: Capture, update, and recover durable working notes, plans, investigations, evaluations, and session write-ups in the user's Markdown notes vault. Use when asked to log work, save progress, write up findings or a plan into a Markdown file ("write this up", "put this in my vault", "save this plan so it doesn't get lost", /log), update an existing vault note with new findings or implementation outcomes, or answer "when/what/why did we ..." about past work.
---

# Captain's log

The vault is the user's working memory across sessions. You add to it the way a principal engineer keeps a shared lab notebook and design record: concise, exact, evidence-backed, and append-only on history.

The vault path comes from the request (the `/log` command passes it) or from the `PI_CAPTAINS_LOG_VAULT` environment variable. If neither is available, ask for it; never guess a directory.

## What a log entry is for

The user works interactively across sessions: investigating systems, designing plans, running evaluations, reviewing PR stacks, implementing fixes, and changing course when reality disagrees with a plan. When they hit a stopping point and say "let's write this up into a markdown file", "save this plan to the vault", or run `/log`, the deliverable is **one living topic or project note** (created or updated in place) that crystallizes the context so the next session can pick the work up cold without redoing the investigation or repeating the conversation.

- **One note per topic, not a daily log feed.** Do not create or append to a separate daily log file (`YYYY-MM-DD.md`) unless the user explicitly asks for a daily note. The vault's git history and dated note/section headers already provide the timeline.
- **Answer the four load-bearing questions:**
  1. **What were we trying to accomplish, and under what constraints?** (Goal, scope, boundaries, what cannot change.)
  2. **What did we change, decide, or discover — and why?** (The mental model, mechanisms, exact code paths/symbols, and the alternatives or dead ends ruled out with the concrete reason each failed so they are not retried.)
  3. **What did we actually verify?** (Measurements, tables of numbers/counts, exact commands/queries run, ticket IDs, PR/commit links, run IDs — kept strictly separate from `[INFERENCE]` or unverified assumptions.)
  4. **What is unfinished or next?** (Open questions, blockers, and the first concrete action when resuming.)
- **Distill conclusions, don't transcribe dialogue.** Write the state and conclusions the session reached, not a play-by-play of the chat. Keep a command, query, or snippet only when someone resuming will need its exact form.
- **Git milestones are references, not the story.** If the request lists detected pushes, PRs, or releases, cite and link them where relevant, but write about the engineering problem, decisions, and evidence — never a bare inventory of git commands.
- **Planning, research, and review sessions count equally.** Many write-ups happen *before* code is written (a design plan or root-cause investigation) or during an evaluation or PR review.
- **Disclose context gaps.** If part of the session is unavailable (compacted, happened in an earlier session, or was not run live), state that explicitly in the note. Never fill gaps from guesswork.

## Layout and filing

Before each entry via `/log`, the extension ensures the top-level role folders exist (adopting existing folders regardless of number prefix or case):

```text
<vault>/
├── 00 Inbox/        notes with no clear domain home yet
├── 10 Projects/     nested domain/project folders (e.g. <Area>/<Service>/, <Area>/Plans/, <Area>/Investigations/)
├── 20 Research/     cross-cutting technical topics, workflows, ML/eval research series
├── 30 Meetings/     meeting notes and recaps (e.g. YYYY/ or YYYY-MM-DD <topic>.md)
├── 40 Career/       accomplishments and reviews; written only on request
└── 90 Archive/      finished projects; moved only on request
```

### Where to file

| Situation | Destination |
|---|---|
| Work on a topic, ticket, or plan the vault already covers | **Update the existing note in place** (append a dated update section; update `Status:` at the top) |
| New plan, investigation, eval write-up, or review in an existing project area | Inside the **existing nested subfolder** where sibling notes live (e.g. `10 Projects/<Area>/<Service>/` or `10 Projects/<Area>/Plans/`) |
| Cross-cutting engineering workflow or research topic | Inside the matching subfolder under `20 Research/` |
| Notes from a meeting, conference, or sync the user provides | `30 Meetings/` (matching existing subfolder convention such as `30 Meetings/<YYYY>/`) |
| Accomplishment for review time | `40 Career/`, **only when the user asks** |
| Unclear home | `00 Inbox/` (never dump loose files at the vault root) |

- **File by domain and topic, never one folder per git repo.** Inspect existing subfolders under `10 Projects/` and `20 Research/` before choosing a path.
- **Filename style:** Use a findable plain Markdown filename matching the destination folder's convention: `YYYY-MM-DD <topic or ticket>.md` for dated plans, investigations, reviews, and eval write-ups, or a stable topic name for evergreen references.

## Shape of a note

Use [research-note.md](templates/research-note.md) as a structural guide, **not a rigid boilerplate**. Match the headings to the mode of work (Plan, Investigation, Evaluation, Architecture/PR Review) and drop any section that has nothing load-bearing to say.

### Header block

Start with `# <Title>` followed by a compact plain-text metadata block (unless the target subfolder specifically uses YAML frontmatter):

```markdown
# <Title>

Status: <Proposed | In progress | Implemented | Verified | Blocked on ... | Superseded by [[...]]>
Date: YYYY-MM-DD
Scope: <systems, environments, or bounded question>
Repositories: <owner/repo or local paths if relevant>
Tickets/PRs: <exact ticket IDs, PR numbers/URLs, branches>
Related: [[<related vault notes>]]
```

### Body sections (adapt headings to the work mode)

- **Summary / What happened / State:** 2–5 sentences stating the problem, what was done or decided, and where things stand right now (with the headline number or verdict up front).
- **Findings / Current behavior / Evidence:** What was observed in code (`path/to/file.py::symbol`), logs, database queries, or eval runs. Use Markdown tables for numbers, failure counts, or model comparisons. Keep exact identifiers (workflow IDs, run IDs, object storage paths, commit SHAs, versions) verbatim.
- **Decision / Design / Plan / Verdicts:** What is being proposed or built, or the per-item verdicts from a review. Include a table or bullet list of **Alternatives considered / Ruled out** with the concrete reason each was rejected so a future session does not re-litigate or retry dead ends.
- **Verification / Commands run:** Only checks, commands, or queries actually executed and their observed outcomes. Explicitly mark unverified claims as `[INFERENCE]` or `unverified`.
- **Open items / Next:** Unfinished work, open decisions, external blockers, and the concrete first action for the next session.

## Updating a living note across sessions

Notes evolve as a plan moves from design to implementation, review, and release:

1. **Update `Status:`** at the top of the note to reflect current reality.
2. **Append a dated section** at the bottom: `## Update YYYY-MM-DD: <milestone, implementation, or direction change>` (or `### Update YYYY-MM-DD (<sub-step>)` when multiple updates happen the same day).
3. **Preserve history — never silently overwrite earlier decisions.** If implementation or testing disproved part of the original plan, leave the earlier section intact and add a **`Corrections to the plan above:`** list inside the new dated section explaining what changed and why (for example, a library quirk discovered during coding, a version bump collision, or a direction change).
4. **Cross-link related notes.** If a new note refines or supersedes an earlier proposal, add a short dated addendum and `[[wikilink]]` to the earlier note so a reader landing on the old file is routed to the new one.

## Resuming and answering from the vault

1. **Before substantial planning, investigation, or implementation:** Search the vault narrowly by ticket ID, PR number, repo name, service name, or topic keywords (`grep`/`glob` scoped to `10 Projects/` and `20 Research/` first; never read the whole vault).
2. **Read the matching note, including all dated `## Update` sections at the bottom**, so you start from the latest decisions and corrections rather than the initial proposal.
3. **Live state beats dated notes.** When answering questions or resuming work, state the note's date and treat live code, config, and deployment state as newer ground truth.
4. **Cite the note path or `[[wikilink]]`** and quote exact identifiers verbatim. If nothing in the vault matches, say so rather than guessing.

## Rules

1. **Search before writing.** Always check for an existing note on the same ticket, PR, or topic before creating a new file.
2. **Fit the vault.** Use existing domain subfolders, `[[wikilinks]]`, and filename conventions. Never reorganize or rename existing notes unless asked.
3. **Append, don't erase history.** Keep earlier sections intact and record corrections in dated update sections.
4. **Ground every claim.** Only record results actually observed and decisions actually reached. Mark inferences as `[INFERENCE]`.
5. **Sanitize secrets.** Never write tokens, passwords, private keys, or raw credentials. Reference the environment variable or secret store key name (or redact as `<SECRET:name>`).
6. **Git hygiene.** Follow the git policy in the request (or commit and push in the vault repo when configured). Stage and commit **only** the vault files you created or updated, with a concise commit message naming the topic or ticket. Never touch untracked scratch files you did not write.
