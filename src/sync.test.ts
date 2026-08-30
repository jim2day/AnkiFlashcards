import { describe, expect, it } from "vitest";
import { fileOwnershipTag, hashPath } from "./ownership";

describe("file ownership tags", () => {
	it("produces a stable hyphenated tag from the vault path", () => {
		const path = "Civ Pro/Personal Jurisdiction.md";
		expect(fileOwnershipTag(path)).toBe(`obsidian-file-${hashPath(path)}`);
		expect(fileOwnershipTag(path)).toMatch(/^obsidian-file-[0-9a-f]{8}$/);
	});

	it("distinguishes different files", () => {
		expect(fileOwnershipTag("Civ Pro/Personal Jurisdiction.md")).not.toBe(
			fileOwnershipTag("Torts.md"),
		);
	});
});
