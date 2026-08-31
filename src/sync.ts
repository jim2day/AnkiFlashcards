import { App, Notice } from "obsidian";
import { AnkiClient, AnkiConnectError, type AnkiNoteInput } from "./anki";
import {
	deckNameFromVaultPath,
	formatCardContext,
	formatCardFront,
	markdownToAnkiHtml,
} from "./format";
import {
	cardOwnershipTag,
	cardTagFromNoteTags,
	fileOwnershipTag,
	GLOBAL_ANKI_TAG,
} from "./ownership";
import { parseCards, type ParsedCard } from "./parser";
import type { AnkiFlashcardsSettings } from "./settings";
import { planFileSync, type DesiredCard } from "./sync-plan";

function occurrenceKey(hierarchy: string[], front: string): string {
	return `${hierarchy.join("\0")}\0${front}`;
}

export function desiredCardsForFile(
	vaultPath: string,
	cards: ParsedCard[],
	settings: AnkiFlashcardsSettings,
): DesiredCard[] {
	const seen = new Map<string, number>();
	return cards.map((card) => {
		const key = occurrenceKey(card.hierarchy, card.front);
		const occurrence = seen.get(key) ?? 0;
		seen.set(key, occurrence + 1);
		return {
			cardTag: cardOwnershipTag(vaultPath, card.hierarchy, card.front, occurrence),
			front: markdownToAnkiHtml(
				formatCardFront(
					card.front,
					card.hierarchy,
					settings.includeHierarchy,
					settings.hierarchySeparator,
				),
			),
			back: markdownToAnkiHtml(card.back),
			context: markdownToAnkiHtml(
				formatCardContext(
					card.hierarchy,
					settings.includeHierarchy,
					settings.hierarchySeparator,
				),
			),
		};
	});
}

function toAnkiInput(deckName: string, fileTag: string, card: DesiredCard): AnkiNoteInput {
	return {
		deckName,
		front: card.front,
		back: card.back,
		context: card.context,
		tags: [GLOBAL_ANKI_TAG, fileTag, card.cardTag],
	};
}

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

		const markdown = await app.vault.read(file);
		const parsed = parseCards(markdown, settings.cardTag);
		const desired = desiredCardsForFile(file.path, parsed, settings);

		const existingIds = await anki.findNotes(`tag:${fileTag}`);
		const existingInfo = await anki.notesInfo(existingIds);
		const plan = planFileSync(
			desired,
			existingInfo.map((note) => ({
				id: note.noteId,
				front: note.fields.Front?.value ?? "",
				tags: note.tags,
				cardIds: note.cards,
			})),
			cardTagFromNoteTags,
			settings.deleteMissingCards,
		);

		if (desired.length === 0 && plan.toDelete.length === 0) {
			new Notice(`No ${settings.cardTag} headings found in ${file.name}.`);
			return;
		}

		for (const update of plan.toUpdate) {
			await anki.updateNoteFields(update.id, {
				Front: update.card.front,
				Back: update.card.back,
				Context: update.card.context,
			});
			await anki.addTags(
				[update.id],
				[GLOBAL_ANKI_TAG, fileTag, update.card.cardTag].join(" "),
			);
			await anki.changeDeck(update.cardIds, deckName);
		}

		const createdIds = await anki.addNotes(
			plan.toCreate.map((card) => toAnkiInput(deckName, fileTag, card)),
		);
		const created = createdIds.filter((id) => id !== null).length;
		const failed = createdIds.length - created;

		if (plan.toDelete.length > 0) {
			await anki.deleteNotes(plan.toDelete);
		}

		const parts = [
			`created ${created}`,
			`updated ${plan.toUpdate.length}`,
			`deleted ${plan.toDelete.length}`,
		];
		const suffix = failed > 0 ? ` ${failed} could not be created.` : "";
		new Notice(`Synced ${file.name}: ${parts.join(", ")}.${suffix}`);
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
