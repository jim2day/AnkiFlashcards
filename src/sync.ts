import { App, Notice } from "obsidian";
import { AnkiClient, AnkiConnectError } from "./anki";
import { deckNameFromVaultPath, formatCardContext, formatCardFront } from "./format";
import { fileOwnershipTag, GLOBAL_ANKI_TAG } from "./ownership";
import { parseCards } from "./parser";
import type { AnkiFlashcardsSettings } from "./settings";

export async function syncCurrentNote(
	app: App,
	settings: AnkiFlashcardsSettings,
	anki: AnkiClient,
): Promise<void> {
	const file = app.workspace.getActiveFile();
	if (!file || file.extension !== "md") {
		new Notice("Open a Markdown file to sync.");
		return;
	}

	const fileTag = fileOwnershipTag(file.path);
	const deckName = deckNameFromVaultPath(file.path, settings.deck);

	try {
		await anki.ping();
		await anki.ensureDeck(deckName);
		await anki.ensureModel();

		if (settings.deleteBeforeSync) {
			const existing = await anki.findNotes(`tag:${fileTag}`);
			await anki.deleteNotes(existing);
		}

		const markdown = await app.vault.read(file);
		const cards = parseCards(markdown, settings.cardTag);

		if (cards.length === 0) {
			if (settings.deleteBeforeSync) {
				new Notice(
					`Deleted existing cards. No ${settings.cardTag} headings found in ${file.name}.`,
				);
			} else {
				new Notice(`No ${settings.cardTag} headings found in ${file.name}.`);
			}
			return;
		}

		const ids = await anki.addNotes(
			cards.map((card) => ({
				deckName,
				front: formatCardFront(
					card.front,
					card.hierarchy,
					settings.includeHierarchy,
					settings.hierarchySeparator,
				),
				back: card.back,
				context: formatCardContext(
					card.hierarchy,
					settings.includeHierarchy,
					settings.hierarchySeparator,
				),
				tags: [GLOBAL_ANKI_TAG, fileTag],
			})),
		);

		const created = ids.filter((id) => id !== null).length;
		const failed = ids.length - created;

		if (failed > 0) {
			new Notice(
				`Synced ${created} of ${cards.length} cards from ${file.name}. Some notes were not created.`,
			);
			return;
		}

		new Notice(`Synced ${created} cards from ${file.name}.`);
	} catch (error) {
		const message =
			error instanceof AnkiConnectError
				? error.message
				: error instanceof Error
					? error.message
					: "Sync failed.";
		new Notice(message);
		console.error("Anki Flashcards sync failed", error);
	}
}

export async function pingAnki(anki: AnkiClient): Promise<void> {
	try {
		const version = await anki.ping();
		new Notice(`AnkiConnect is reachable (API version ${version}).`);
	} catch (error) {
		const message =
			error instanceof AnkiConnectError
				? error.message
				: "Could not reach AnkiConnect.";
		new Notice(message);
		console.error("Anki Flashcards ping failed", error);
	}
}
