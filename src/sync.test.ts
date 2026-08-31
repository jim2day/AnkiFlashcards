import { describe, expect, it } from "vitest";
import { cardOwnershipTag, fileOwnershipTag, hashPath } from "./ownership";

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

describe("card ownership tags", () => {
	it("is stable for the same path, hierarchy, and question", () => {
		expect(cardOwnershipTag("a.md", ["Civ Pro"], "Q", 0)).toBe(
			cardOwnershipTag("a.md", ["Civ Pro"], "Q", 0),
		);
	});

	it("changes when the question or hierarchy changes", () => {
		const base = cardOwnershipTag("a.md", ["Civ Pro"], "Q", 0);
		expect(cardOwnershipTag("a.md", ["Civ Pro"], "Other", 0)).not.toBe(base);
		expect(cardOwnershipTag("a.md", ["Torts"], "Q", 0)).not.toBe(base);
	});
});
