---
name: logbook
description: Keep the user's engineering logbook in their Markdown notes vault - a dated daily log of work done plus research notes for findings worth keeping - and search it later. Use when asked to log work, save progress, write up findings, or answer "when/what/why did I ..." about past work.
---

# Logbook

The vault is the user's notes, not yours. You add to it carefully, the way a colleague would add to a shared lab notebook: concise, exact and append-only.

The vault path comes from the request (the `/log` command passes it) or from the `PI_LOGBOOK_VAULT` environment variable. If neither is available, ask for it; never guess a directory.

## Two kinds of notes

### Daily log

One file per local calendar day, at `<vault>/<daily dir>/YYYY-MM-DD.md` (the request gives the exact path). Append under a `## HH:MM` heading; never rewrite earlier entries. Create the file with a `# YYYY-MM-DD` title if it does not exist.

Each entry is a few bullets a reader can scan in ten seconds, years from now:

```markdown
## 14:32
- **fq-ai-core, SM-2041:** fixed garbled-font detection and Textract box clamping; pushed 3 commits to PR #17 (https://github.com/org/repo/pull/17).
- Live eval on 9 leases: 7.5 pages/s at concurrency 24, $3.10 total. Details: [[2026-10-07 routed PDF OCR live lease eval]].
- Open: prod Textract quota unknown (no access).
```

- Lead with the repo/project and the ticket, then what changed and the outcome.
- Include the identifiers someone would search for: ticket IDs, PR and issue URLs, commit SHAs, branch names, run or workflow IDs, environment names.
- Say what is still open. A log that only records successes is hard to trust later.
- Link research notes with the vault's link style (wikilinks if the vault already uses them, otherwise relative Markdown links).

### Research notes

Write one when the work produced evidence worth more than a bullet: measurements, comparisons, a debugging chain, a decision and its reasons, exact commands and results. One note per question, named so it is findable: `YYYY-MM-DD <topic>.md` for a dated snapshot, or a stable topic name for a living note.

Structure: the conclusion first, then setup, results (tables for numbers), what changed because of it, and open items. Link back to the daily log day.

## Rules

1. **Search before writing.** Look for an existing note on the same ticket, PR or topic; update it instead of creating a duplicate. Search narrowly (ticket ID, repo, exact phrase), never by reading the whole vault.
2. **Fit the vault.** Use its existing folders, filename style, link style and frontmatter conventions. Do not impose a folder layout. If no folder fits, use the inbox folder if one exists, otherwise the vault root.
3. **Append, don't rewrite history.** Add dated sections to living notes; leave earlier text intact even when it is now wrong, and note the correction instead.
4. **Only what happened.** Record commands that actually ran and results actually observed. Mark anything inferred as inferred. Never invent numbers.
5. **No secrets.** Never write tokens, passwords, keys or connection strings. Refer to the secret's name or location instead.
6. **Live state beats notes.** When answering from the logbook, say how old the note is; code, config and deploy state are newer truth.
7. **Git, as instructed.** Follow the git instruction in the request. Commit only the files you wrote, with a message naming the topic. Push only when told to.

## Answering from the logbook

For "when did I ...", "what did we decide about ...", or "what was the ID from ...":

1. Search the daily log and research notes by exact identifiers first, then by topic words.
2. Read only the matching notes.
3. Answer with the date and a link to the note. Quote the identifier exactly.
4. If nothing matches, say so; do not reconstruct an answer from memory.
