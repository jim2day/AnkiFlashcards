import { formatCardFront, markdownToAnkiHtml } from "./format";
import { cardOwnershipTag } from "./ownership";
import type { ParsedCard } from "./parser";
import type { DesiredCard } from "./sync-plan";

export interface CardFormatSettings {
	includeHierarchy: boolean;
	hierarchySeparator: string;
}

function occurrenceKey(hierarchy: string[], front: string): string {
	return `${hierarchy.join("\0")}\0${front}`;
}

function questionFront(card: ParsedCard, settings: CardFormatSettings): string {
	return markdownToAnkiHtml(
		formatCardFront(
			card.front,
			card.hierarchy,
			settings.includeHierarchy,
			settings.hierarchySeparator,
		),
	);
}

function answerFront(card: ParsedCard, settings: CardFormatSettings): string {
	const body = card.back;
	if (!settings.includeHierarchy || card.hierarchy.length === 0) {
		return markdownToAnkiHtml(body);
	}
	return markdownToAnkiHtml(`${card.hierarchy.join(settings.hierarchySeparator)}\n\n${body}`);
}

export function desiredCardsForFile(
	vaultPath: string,
	cards: ParsedCard[],
	settings: CardFormatSettings,
): DesiredCard[] {
	const seen = new Map<string, number>();
	const desired: DesiredCard[] = [];

	for (const card of cards) {
		const key = occurrenceKey(card.hierarchy, card.front);
		const occurrence = seen.get(key) ?? 0;
		seen.set(key, occurrence + 1);
		const question = questionFront(card, settings);
		const answer = markdownToAnkiHtml(card.back);

		desired.push({
			cardTag: cardOwnershipTag(vaultPath, card.hierarchy, card.front, occurrence, "fwd"),
			front: question,
			back: answer,
		});

		if (card.reversed && card.back.trim().length > 0) {
			desired.push({
				cardTag: cardOwnershipTag(vaultPath, card.hierarchy, card.front, occurrence, "rev"),
				front: answerFront(card, settings),
				back: markdownToAnkiHtml(card.front),
			});
		}
	}

	return desired;
}
