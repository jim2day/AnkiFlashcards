const OWNERSHIP_PREFIX = "obsidian-file-";

export const GLOBAL_ANKI_TAG = "obsidian";

export function hashPath(path: string): string {
	let hash = 0x811c9dc5;
	for (let i = 0; i < path.length; i++) {
		hash ^= path.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	return (hash >>> 0).toString(16).padStart(8, "0");
}

export function fileOwnershipTag(vaultPath: string): string {
	return `${OWNERSHIP_PREFIX}${hashPath(vaultPath)}`;
}
