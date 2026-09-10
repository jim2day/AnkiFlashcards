# Anki Flashcards (Obsidian plugin)

Treats Obsidian Markdown as the source of truth and creates Anki notes from headings tagged `#card`. The plugin does not write IDs (or anything else) into your notes.

## Requirements

- [Obsidian](https://obsidian.md) desktop
- [Anki](https://apps.ankiweb.net) with the [AnkiConnect](https://foosoft.net/projects/anki-connect/) add-on
- AnkiConnect CORS origin `app://obsidian.md`

In Anki: **Tools → Add-ons → AnkiConnect → Config**. Add `app://obsidian.md` to `webCorsOriginList`, then restart Anki.

## Install (development)

1. `npm install`
2. `npm test`
3. `npm run build`
4. Copy `main.js`, `manifest.json`, and `styles.css` into:

   `<vault>/.obsidian/plugins/anki-flashcards/`

5. Enable **Anki Flashcards** under **Settings → Community plugins**.

## Usage

Mark a heading with `#card`. The heading is the question; the content until the next equal-or-higher heading (or the next `#card` / `#card-reversed` heading) is the back. Parent headings are prepended to the **Front** only (not repeated as a Context field).

Use `#card-reversed` for both directions. Sync creates **two Anki notes**: question → answer and answer → question. After sync, Browse should show two notes with swapped Front/Back. The notice `created 2` (or `created 1` if the forward note already existed) is the success check.

When reviewing, the front shows the heading chain; the back is only the answer (the chain is not repeated).

Example front: `Civil Procedure → Personal Jurisdiction → Minimum Contacts → What is purposeful availment?`

The Anki deck follows the note’s vault path (`Folder/Note.md` → `Folder::Note`). An optional settings prefix becomes the root deck.

Card backs keep Markdown structure in Anki: numbered/bulleted lists, extra lines on a list item, and paragraph line breaks.

Command palette:

- **Sync current note to Anki** — create new cards, update existing ones in place (review history is kept), and delete Anki notes whose `#card` headings were removed
- **Ping AnkiConnect** — checks that Anki is reachable

Identity is a hash of file path + heading hierarchy + question (stored as an Anki tag, not in Markdown). Renaming the question or moving it under different parents counts as a new card.

A file with no `#card` headings deletes that file’s Anki notes if “Delete cards removed from the note” is on.

Renaming or moving a Markdown file changes its ownership tag, so old Anki notes are left behind. Delete them in Anki or sync the old path once more before moving.

## Settings

- AnkiConnect URL (default `http://127.0.0.1:8765`)
- Deck prefix (optional root deck; path supplies the rest)
- Card tag (default `#card`; `#card-reversed` is two-way)
- Include hierarchy / separator
- Delete cards removed from the note
