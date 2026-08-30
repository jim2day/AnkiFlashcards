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

Mark a heading with `#card`. The heading is the question; the content until the next equal-or-higher heading (or the next `#card` heading) is the back. Parent headings are prepended to the **Front** as one chain (and stored in **Context**).

Example front: `Civil Procedure → Personal Jurisdiction → Minimum Contacts → What is purposeful availment?`

The Anki deck follows the note’s vault path (`Folder/Note.md` → `Folder::Note`). An optional settings prefix becomes the root deck.

Command palette:

- **Sync current note to Anki** — deletes this file’s previous notes (by tag) and recreates them
- **Ping AnkiConnect** — checks that Anki is reachable

A file with no `#card` headings still deletes that file’s Anki notes if “Delete existing cards before sync” is on.

Renaming or moving a Markdown file changes its ownership tag, so old Anki notes are left behind. Delete them in Anki or sync the old path once more before moving.

## Settings

- AnkiConnect URL (default `http://127.0.0.1:8765`)
- Deck prefix (optional root deck; path supplies the rest)
- Card tag (default `#card`)
- Include hierarchy / separator
- Delete existing cards before sync
