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

export function formatCardContext(
	hierarchy: string[],
	includeHierarchy: boolean,
	separator: string,
): string {
	if (!includeHierarchy || hierarchy.length === 0) {
		return "";
	}
	return hierarchy.join(separator);
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
