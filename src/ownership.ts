export const GLOBAL_ANKI_TAG = "obsidian";
export const FILE_TAG_PREFIX = "obsidian-file-";
export const CARD_TAG_PREFIX = "obsidian-card-";

export function hashString(value: string): string {
	let hash = 0x811c9dc5;
	for (let i = 0; i < value.length; i++) {
		hash ^= value.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return (hash >>> 0).toString(16).padStart(8, "0");
}

export function hashPath(path: string): string {
	return hashString(path);
}

export function fileOwnershipTag(vaultPath: string): string {
	return `${FILE_TAG_PREFIX}${hashString(vaultPath)}`;
}

export function cardIdentityKey(
	vaultPath: string,
	hierarchy: string[],
	front: string,
	occurrence: number,
	direction: "fwd" | "rev" = "fwd",
): string {
	const base = `${vaultPath}\0${hierarchy.join("\0")}\0${front}\0${occurrence}`;
	return direction === "rev" ? `${base}\0rev` : base;
}

export function cardOwnershipTag(
	vaultPath: string,
	hierarchy: string[],
	front: string,
	occurrence: number,
	direction: "fwd" | "rev" = "fwd",
): string {
	return `${CARD_TAG_PREFIX}${hashString(cardIdentityKey(vaultPath, hierarchy, front, occurrence, direction))}`;
}

export function cardTagFromNoteTags(tags: string[]): string | undefined {
	return tags.find((tag) => tag.startsWith(CARD_TAG_PREFIX));
}
