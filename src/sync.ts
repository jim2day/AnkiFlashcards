import { App, Notice } from "obsidian";
import { AnkiClient, AnkiConnectError, type AnkiNoteInput } from "./anki";
import { desiredCardsForFile } from "./cards";
import { deckNameFromVaultPath } from "./format";
import { cardTagFromNoteTags, fileOwnershipTag, GLOBAL_ANKI_TAG } from "./ownership";
import { parseCards } from "./parser";
import type { AnkiFlashcardsSettings } from "./settings";
import { planFileSync, type DesiredCard } from "./sync-plan";

function extraFields(modelFields: string[]): Record<string, string> {
	const extra: Record<string, string> = {};
	if (modelFields.includes("Context")) {
		extra.Context = "";
	}
	if (modelFields.includes("Reverse")) {
		extra.Reverse = "";
	}
	return extra;
}

function toAnkiInput(
	deckName: string,
	fileTag: string,
	card: DesiredCard,
	modelFields: string[],
): AnkiNoteInput {
	return {
		deckName,
		front: card.front,
		back: card.back,
		tags: [GLOBAL_ANKI_TAG, fileTag, card.cardTag],
		extraFields: extraFields(modelFields),
	};
}

function noteFields(card: DesiredCard, modelFields: string[]): Record<string, string> {
	return {
		Front: card.front,
		Back: card.back,
		...extraFields(modelFields),
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
		const modelFields = await anki.ensureModel();

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
			await anki.updateNoteFields(update.id, noteFields(update.card, modelFields));
			await anki.addTags(
				[update.id],
				[GLOBAL_ANKI_TAG, fileTag, update.card.cardTag].join(" "),
			);
			await anki.changeDeck(update.cardIds, deckName);
		}

		const createdIds = await anki.addNotes(
			plan.toCreate.map((card) => toAnkiInput(deckName, fileTag, card, modelFields)),
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
