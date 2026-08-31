export const OBSIDIAN_MODEL_NAME = "Obsidian Basic";

const MODEL_CSS = `.card {
  font-family: arial;
  font-size: 20px;
  text-align: left;
  color: black;
  background-color: white;
}
.anki-flashcards-context {
  margin-top: 1em;
  font-size: 0.85em;
  opacity: 0.75;
}
.card ol, .card ul {
  margin: 0.4em 0;
  padding-left: 1.4em;
}
.card li {
  margin: 0.25em 0;
}
.card p {
  margin: 0.4em 0;
}`;

export interface AnkiNoteInput {
	deckName: string;
	front: string;
	back: string;
	context: string;
	tags: string[];
}

export interface AnkiNoteInfo {
	noteId: number;
	tags: string[];
	fields: Record<string, { value: string; order: number }>;
	cards: number[];
}

export class AnkiConnectError extends Error {
	constructor(message: string, readonly cause?: unknown) {
		super(message);
		this.name = "AnkiConnectError";
	}
}

interface AnkiConnectResponse<T> {
	result: T;
	error: string | null;
}

export class AnkiClient {
	constructor(private readonly url: string) {}

	async ping(): Promise<number> {
		return this.invoke<number>("version");
	}

	async ensureDeck(deckName: string): Promise<void> {
		await this.invoke("createDeck", { deck: deckName });
	}

	async ensureModel(): Promise<void> {
		const names = await this.invoke<string[]>("modelNames");
		if (!names.includes(OBSIDIAN_MODEL_NAME)) {
			await this.invoke("createModel", {
				modelName: OBSIDIAN_MODEL_NAME,
				inOrderFields: ["Front", "Back", "Context"],
				css: MODEL_CSS,
				cardTemplates: [
					{
						Name: "Card 1",
						Front: "{{Front}}",
						Back:
							"{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}{{#Context}}\n<div class=\"anki-flashcards-context\">{{Context}}</div>\n{{/Context}}",
					},
				],
			});
			return;
		}
		await this.invoke("updateModelStyling", {
			model: {
				name: OBSIDIAN_MODEL_NAME,
				css: MODEL_CSS,
			},
		});
	}

	async findNotes(query: string): Promise<number[]> {
		return this.invoke<number[]>("findNotes", { query });
	}

	async deleteNotes(noteIds: number[]): Promise<void> {
		if (noteIds.length === 0) {
			return;
		}
		await this.invoke("deleteNotes", { notes: noteIds });
	}

	async notesInfo(noteIds: number[]): Promise<AnkiNoteInfo[]> {
		if (noteIds.length === 0) {
			return [];
		}
		return this.invoke<AnkiNoteInfo[]>("notesInfo", { notes: noteIds });
	}

	async addNotes(notes: AnkiNoteInput[]): Promise<(number | null)[]> {
		if (notes.length === 0) {
			return [];
		}
		return this.invoke<(number | null)[]>("addNotes", {
			notes: notes.map((note) => ({
				deckName: note.deckName,
				modelName: OBSIDIAN_MODEL_NAME,
				fields: {
					Front: note.front,
					Back: note.back,
					Context: note.context,
				},
				tags: note.tags,
				options: {
					allowDuplicate: true,
					duplicateScope: "deck",
				},
			})),
		});
	}

	async updateNoteFields(
		noteId: number,
		fields: { Front: string; Back: string; Context: string },
	): Promise<void> {
		await this.invoke("updateNoteFields", {
			note: {
				id: noteId,
				fields,
			},
		});
	}

	async addTags(noteIds: number[], tags: string): Promise<void> {
		if (noteIds.length === 0) {
			return;
		}
		await this.invoke("addTags", { notes: noteIds, tags });
	}

	async changeDeck(cardIds: number[], deck: string): Promise<void> {
		if (cardIds.length === 0) {
			return;
		}
		await this.invoke("changeDeck", { cards: cardIds, deck });
	}

	private async invoke<T>(action: string, params?: Record<string, unknown>): Promise<T> {
		let response: Response;
		try {
			response = await fetch(this.url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action,
					version: 6,
					params: params ?? {},
				}),
			});
		} catch (error) {
			throw new AnkiConnectError(
				"Could not reach AnkiConnect. Make sure Anki is running with the AnkiConnect add-on, and that app://obsidian.md is in webCorsOriginList.",
				error,
			);
		}

		if (!response.ok) {
			throw new AnkiConnectError(
				`AnkiConnect returned HTTP ${response.status}. Check the AnkiConnect URL in settings.`,
			);
		}

		let payload: AnkiConnectResponse<T>;
		try {
			payload = (await response.json()) as AnkiConnectResponse<T>;
		} catch (error) {
			throw new AnkiConnectError("AnkiConnect returned an invalid response.", error);
		}

		if (payload.error) {
			throw new AnkiConnectError(payload.error);
		}

		return payload.result;
	}
}
