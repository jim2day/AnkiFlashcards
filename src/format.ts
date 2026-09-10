export function formatCardFront(
	front: string,
	hierarchy: string[],
	includeHierarchy: boolean,
	separator: string,
): string {
	if (!includeHierarchy || hierarchy.length === 0) {
		return front;
	}
	return [...hierarchy, front].join(separator);
}

const ORDERED_ITEM = /^(\s*)\d+\.\s+(.*)$/;
const UNORDERED_ITEM = /^(\s*)[-*+]\s+(.*)$/;

export function escapeHtml(text: string): string {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineHtml(text: string): string {
	const escaped = escapeHtml(text);
	return escaped
		.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
		.replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1<em>$2</em>");
}

function isOrderedItem(line: string): boolean {
	return ORDERED_ITEM.test(line);
}

function isUnorderedItem(line: string): boolean {
	return UNORDERED_ITEM.test(line);
}

function isListItem(line: string): boolean {
	return isOrderedItem(line) || isUnorderedItem(line);
}

function listItemText(line: string): string {
	const ordered = line.match(ORDERED_ITEM);
	if (ordered?.[2] !== undefined) {
		return ordered[2];
	}
	return line.match(UNORDERED_ITEM)?.[2] ?? line;
}

function isIndentedContinuation(line: string): boolean {
	return /^\s+\S/.test(line) && !isListItem(line);
}

function consumeList(lines: string[], start: number, ordered: boolean): { html: string; next: number } {
	const tag = ordered ? "ol" : "ul";
	const matchItem = ordered ? isOrderedItem : isUnorderedItem;
	const items: string[] = [];
	let i = start;

	while (i < lines.length) {
		const line = lines[i];
		if (line === undefined) {
			break;
		}
		if (line.trim() === "") {
			const next = lines[i + 1];
			if (next !== undefined && matchItem(next)) {
				i += 1;
				continue;
			}
			break;
		}
		if (matchItem(line)) {
			items.push(`<li>${inlineHtml(listItemText(line))}`);
			i += 1;
			while (i < lines.length) {
				const cont = lines[i];
				if (cont === undefined || !isIndentedContinuation(cont)) {
					break;
				}
				items[items.length - 1] += `<br>${inlineHtml(cont.trim())}`;
				i += 1;
			}
			items[items.length - 1] += "</li>";
			continue;
		}
		break;
	}

	return { html: `<${tag}>${items.join("")}</${tag}>`, next: i };
}

/** Convert Markdown used on a card into HTML Anki will actually display. */
export function markdownToAnkiHtml(markdown: string): string {
	const lines = markdown.replace(/\r\n/g, "\n").split("\n");
	const parts: string[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];
		if (line === undefined) {
			break;
		}
		if (line.trim() === "") {
			i += 1;
			continue;
		}
		if (isOrderedItem(line)) {
			const block = consumeList(lines, i, true);
			parts.push(block.html);
			i = block.next;
			continue;
		}
		if (isUnorderedItem(line)) {
			const block = consumeList(lines, i, false);
			parts.push(block.html);
			i = block.next;
			continue;
		}

		const paragraph: string[] = [];
		while (i < lines.length) {
			const current = lines[i];
			if (current === undefined || current.trim() === "" || isListItem(current)) {
				break;
			}
			paragraph.push(inlineHtml(current));
			i += 1;
		}
		parts.push(`<p>${paragraph.join("<br>")}</p>`);
	}

	return parts.join("");
}

/** Vault-relative path → Anki nested deck (`Folder::Note`). Optional prefix is the root deck. */
export function deckNameFromVaultPath(vaultPath: string, prefix = ""): string {
	const normalized = vaultPath.replace(/\\/g, "/").replace(/\.md$/i, "");
	const segments = normalized
		.split("/")
		.map((part) => part.replace(/::/g, " ").trim())
		.filter((part) => part.length > 0);
	const fromPath = segments.join("::");
	const root = prefix.trim();
	if (root && fromPath) {
		return `${root}::${fromPath}`;
	}
	return fromPath || root || "Default";
}
