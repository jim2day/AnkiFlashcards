export interface DesiredCard {
	cardTag: string;
	front: string;
	back: string;
	context: string;
}

export interface ExistingNote {
	id: number;
	front: string;
	tags: string[];
	cardIds: number[];
}

export interface NoteUpdate {
	id: number;
	card: DesiredCard;
	cardIds: number[];
}

export interface FileSyncPlan {
	toCreate: DesiredCard[];
	toUpdate: NoteUpdate[];
	toDelete: number[];
}

export function planFileSync(
	desired: DesiredCard[],
	existing: ExistingNote[],
	cardTagFromNoteTags: (tags: string[]) => string | undefined,
	deleteMissing: boolean,
): FileSyncPlan {
	const toCreate: DesiredCard[] = [];
	const toUpdate: NoteUpdate[] = [];
	const matchedIds = new Set<number>();

	const existingByCardTag = new Map<string, ExistingNote>();
	const legacy: ExistingNote[] = [];

	for (const note of existing) {
		const tag = cardTagFromNoteTags(note.tags);
		if (tag && !existingByCardTag.has(tag)) {
			existingByCardTag.set(tag, note);
		} else {
			legacy.push(note);
		}
	}

	const unmatchedDesired: DesiredCard[] = [];
	for (const card of desired) {
		const match = existingByCardTag.get(card.cardTag);
		if (match) {
			toUpdate.push({ id: match.id, card, cardIds: match.cardIds });
			matchedIds.add(match.id);
			existingByCardTag.delete(card.cardTag);
		} else {
			unmatchedDesired.push(card);
		}
	}

	const leftoverLegacy = legacy.filter((note) => !matchedIds.has(note.id));
	for (const card of unmatchedDesired) {
		const index = leftoverLegacy.findIndex((note) => note.front === card.front);
		const legacyMatch = index >= 0 ? leftoverLegacy[index] : undefined;
		if (legacyMatch) {
			leftoverLegacy.splice(index, 1);
			toUpdate.push({ id: legacyMatch.id, card, cardIds: legacyMatch.cardIds });
			matchedIds.add(legacyMatch.id);
		} else {
			toCreate.push(card);
		}
	}

	const toDelete = deleteMissing
		? existing.filter((note) => !matchedIds.has(note.id)).map((note) => note.id)
		: [];

	return { toCreate, toUpdate, toDelete };
}
