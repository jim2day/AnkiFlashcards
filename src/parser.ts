export interface ParsedCard {
	front: string;
	back: string;
	hierarchy: string[];
	reversed: boolean;
}

interface Heading {
	line: number;
	level: number;
	text: string;
	isCard: boolean;
	reversed: boolean;
}

export function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function reversedCardTag(cardTag: string): string {
	return `${cardTag}-reversed`;
}

function cardTagPattern(tag: string): RegExp {
	return new RegExp(`(^|\\s)${escapeRegExp(tag)}(?=\\s|$)`);
}

export function headingHasCardTag(text: string, cardTag: string): boolean {
	return cardTagPattern(cardTag).test(text);
}

export function stripCardTag(text: string, cardTag: string): string {
	return text
		.replace(new RegExp(`(^|\\s)${escapeRegExp(cardTag)}(?=\\s|$)`, "g"), "$1")
		.replace(/[ \t]+/g, " ")
		.trim();
}

export function stripCardTags(text: string, cardTag: string): string {
	return stripCardTag(stripCardTag(text, reversedCardTag(cardTag)), cardTag);
}

export function headingIsReversed(text: string, cardTag: string): boolean {
	return headingHasCardTag(text, reversedCardTag(cardTag));
}

export function headingIsCard(text: string, cardTag: string): boolean {
	return headingIsReversed(text, cardTag) || headingHasCardTag(text, cardTag);
}

export function stripYamlFrontmatter(markdown: string): string {
	const withNewline = markdown.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
	if (withNewline) {
		return markdown.slice(withNewline[0].length);
	}
	const atEof = markdown.match(/^---\r?\n[\s\S]*?\r?\n---\s*$/);
	if (atEof) {
		return "";
	}
	return markdown;
}

function parseHeadings(lines: string[], cardTag: string): Heading[] {
	const headings: Heading[] = [];
	for (let i = 0; i < lines.length; i++) {
		const match = lines[i]?.match(/^(#{1,6})[ \t]+(.*)$/);
		if (!match?.[1] || match[2] === undefined) {
			continue;
		}
		const raw = match[2];
		headings.push({
			line: i,
			level: match[1].length,
			text: stripCardTags(raw, cardTag),
			isCard: headingIsCard(raw, cardTag),
			reversed: headingIsReversed(raw, cardTag),
		});
	}
	return headings;
}

function extractBack(lines: string[], headings: Heading[], index: number): string {
	const heading = headings[index];
	if (!heading) {
		return "";
	}
	let endLine = lines.length;
	for (let j = index + 1; j < headings.length; j++) {
		const next = headings[j];
		if (!next) {
			continue;
		}
		if (next.level <= heading.level || next.isCard) {
			endLine = next.line;
			break;
		}
	}
	return lines.slice(heading.line + 1, endLine).join("\n").trim();
}

export function parseCards(markdown: string, cardTag = "#card"): ParsedCard[] {
	const body = stripYamlFrontmatter(markdown);
	const lines = body.split(/\r?\n/);
	const headings = parseHeadings(lines, cardTag);
	const cards: ParsedCard[] = [];
	const stack: Heading[] = [];

	for (let i = 0; i < headings.length; i++) {
		const heading = headings[i];
		if (!heading) {
			continue;
		}
		while (stack.length > 0) {
			const parent = stack[stack.length - 1];
			if (!parent || parent.level < heading.level) {
				break;
			}
			stack.pop();
		}
		if (heading.isCard && heading.text.length > 0) {
			cards.push({
				front: heading.text,
				back: extractBack(lines, headings, i),
				hierarchy: stack.map((item) => item.text),
				reversed: heading.reversed,
			});
		}
		stack.push(heading);
	}

	return cards;
}
