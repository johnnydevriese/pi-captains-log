---
name: captains-log
description: Keep the user's engineering logbook in their Markdown notes vault - a session note that crystallizes what a working session established (goal, understanding, decisions, evidence, where to resume) plus a brief dated daily-log entry linking to it - and search it later. Use when asked to log work, save progress, write up findings ("let's write this up", /log), or answer "when/what/why did I ..." about past work.
---

# Captain's log

The vault is the user's notes, not yours. You add to it carefully, the way a colleague would add to a shared lab notebook: concise, exact and append-only.

The vault path comes from the request (the `/log` command passes it) or from the `PI_CAPTAINS_LOG_VAULT` environment variable. If neither is available, ask for it; never guess a directory.

## What a log entry is for

The user works interactively: researching, discussing, trying things, changing course. When they say "let's write this up" or run `/log`, the main deliverable is a **session note**: a distilled record that lets them pick the topic up weeks later without repeating the investigation or the conversation. Someone reading it cold should learn what was being attempted, what is now understood, what was decided and ruled out, what evidence backs it, and what to do next.

The daily log entry is secondary: a few lines saying what happened today and linking to the session note.

- **Distill, don't transcribe.** Write the conclusions the conversation reached, not the dialogue that reached them. Do not list every tool call, file read or command. Keep a command or quote only when someone would need it again.
- **Git milestones are hints, not the content.** The request may list detected pushes, PRs or releases. They mark a stopping point and are useful references (link them), but the note is about the understanding and decisions, not an inventory of git activity.
- **Research-only sessions count.** A session that changed no code but explained how something works, compared options or ruled out a theory deserves a session note just as much.
- **The user's note leads.** If the request includes the user's own note, treat it as their framing of what mattered.
- **Disclose context gaps.** If you cannot see part of the session (it was compacted, started before you joined, or happened outside the conversation), say so in the note and in your reply. Record what you can verify; never fill the gap from guesswork.

Every write-up produces or updates a session note. A small session gets a short note: drop the sections it has nothing for rather than skipping the note or padding it.

## Layout

Before each entry the extension makes sure the vault has these folders. It reuses a folder the vault already has for a role (`Projects/` and `10 Projects/` both count), and the request lists the actual names, so use those, not the defaults below:

```text
<vault>/
├── 00 Inbox/        notes with no suitable home yet
├── 05 Daily Log/    one file per day: YYYY-MM-DD.md
├── 10 Projects/     subfolders for ongoing projects or areas
├── 20 Research/     topics not tied to one project
├── 30 Meetings/     YYYY-MM-DD <topic>.md
├── 40 Career/       accomplishments and reviews; written only on request
└── 90 Archive/      finished projects; moved only on request
```

Templates are in this skill's `templates/` directory: [daily-log.md](templates/daily-log.md), [research-note.md](templates/research-note.md) (the session note), [meeting-note.md](templates/meeting-note.md). Follow their shape; drop sections and placeholder lines that don't apply rather than filling them with filler.

### What goes where

| Note | Folder |
|---|---|
| Today's entry | daily: `YYYY-MM-DD.md`, appended |
| Session note on a topic the vault already covers | the existing note, appended; otherwise a new note in the folder where related notes already live |
| Session note on a new topic | the best-fit existing domain or topic folder (under projects or research); research for cross-cutting topics |
| Session note with no suitable home | inbox |
| Notes from a meeting the user describes or pastes | meetings |
| A win worth remembering at review time | career, append to `YYYY accomplishments.md`, **only when the user asks** ("add this to my brag doc") |
| A project that is finished | archive: move its folder **only when the user asks** |

File by topic, not by where the session ran: a session in repo `acme/widgets` about CSV parsing belongs with existing parsing notes if there are some. Do not create a new subfolder for each repo or ticket; create one only when the topic is clearly ongoing and nothing existing fits.

## Kinds of notes

### Session notes

Use the [research-note.md](templates/research-note.md) template. Name new notes so they are findable: a stable topic name for a living note (`CSV importer.md`), or `YYYY-MM-DD <topic>.md` for a one-off snapshot.

Capture, in this order, only the parts the session actually produced:

1. **Bottom line** - current status and the answer or decision in two or three sentences, with the key number or identifier.
2. **Goal** - what the user set out to do or learn, and the constraints that shaped it (deadlines, compatibility, what must not change).
3. **How it works** - the explanation or mental model the session arrived at: explain the mechanism in the note itself, well enough to reason about the problem again without rereading the sources. Links to files, functions, docs and URLs supplement that explanation; they don't replace it.
4. **Decisions** - what was chosen and why, and the paths ruled out with the reason each was dropped, so they are not retried.
5. **Evidence** - what was actually observed: measurements (tables for numbers), commands whose exact form matters, error messages, PRs, commits, run IDs. Keep observations separate from hypotheses and mark anything unverified as such.
6. **Resume here** - where things stand, the first concrete next action, and the questions still open.

Be concise, but include enough context that the reader does not have to rediscover it. Link the daily log day.

**Updating an existing note.** Append a `## YYYY-MM-DD` section with what this session added or changed: current status, new findings, revised decisions, a new resume point. Leave earlier text intact, header lines included, even when it is now wrong; say what is superseded and why in the new section.

### Daily log

One file per local calendar day, at `<vault>/<daily dir>/YYYY-MM-DD.md` (the request gives the exact path). Append under a `## HH:MM` heading; never rewrite earlier entries. Create the file with a `# YYYY-MM-DD` title if it does not exist.

Each entry is a few bullets a reader can scan in ten seconds: the outcome, what is still open, and a link to the session note. Don't repeat the session note's content.

```markdown
## 14:32
- **acme/widgets, PROJ-123:** CSV importer now handles quoted commas; PR #42 (https://github.com/acme/widgets/pull/42). Why and what was ruled out: [[CSV importer]].
- Open: staging rollout waits on the schema migration (PROJ-130).

## 16:05
- Worked out why Postgres ignores the partial index for the nightly report; fix not yet chosen. [[Postgres partial index planning]].
```

- Lead with the repo/project or topic and the ticket, then the outcome.
- Include the identifiers someone would search for: ticket IDs, PR and issue URLs, commit SHAs, branch names, run IDs.
- Say what is still open. A log that only records successes is hard to trust later.
- Link with the vault's link style (wikilinks if the vault already uses them, otherwise relative Markdown links).

### Meeting notes

Only from what the user gives you: their notes, a transcript, or a summary they dictate. Never invent attendees or decisions. Use the meeting-note template and link the meeting from that day's daily log.

## Rules

1. **Search before writing.** Look for an existing note on the same topic, ticket, PR or repo, and the folder where related notes live; update or file next to them instead of creating a duplicate. Search narrowly (ticket ID, exact phrase, topic words, folder names), never by reading the whole vault.
2. **Fit the vault.** Use its existing subfolders, filename style, link style and frontmatter conventions. Never rename or reorganize existing notes.
3. **Append, don't rewrite history.** Add dated sections to living notes; leave earlier text intact even when it is now wrong, and note the correction instead.
4. **Only what happened.** Record results actually observed and conclusions actually reached. Mark inferences and hypotheses as such. Never invent numbers, observations or decisions.
5. **No secrets.** Never write tokens, passwords, keys or connection strings. Refer to the secret's name or location instead.
6. **Live state beats notes.** When answering from the logbook, say how old the note is; code, config and deploy state are newer truth.
7. **Git, as instructed.** Follow the git instruction in the request. Commit only the files you wrote, with a message naming the topic. Push only when told to.

## Answering from the logbook

For "when did I ...", "what did we decide about ...", or "what was the ID from ...":

1. Search session notes and the daily log by exact identifiers first, then by topic words.
2. Read only the matching notes, including their dated update sections.
3. Answer with the date and a link to the note. Quote the identifier exactly.
4. If nothing matches, say so; do not reconstruct an answer from memory.
