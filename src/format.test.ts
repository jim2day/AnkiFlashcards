import { describe, expect, it } from "vitest";
import { deckNameFromVaultPath, formatCardContext, formatCardFront } from "./format";

describe("formatCardFront", () => {
	it("joins parent headings and the question into one chain", () => {
		expect(
			formatCardFront(
				"What is purposeful availment?",
				["Civil Procedure", "Personal Jurisdiction", "Minimum Contacts"],
				true,
				" → ",
			),
		).toBe(
			"Civil Procedure → Personal Jurisdiction → Minimum Contacts → What is purposeful availment?",
		);
	});

	it("leaves the question unchanged when hierarchy is disabled", () => {
		expect(formatCardFront("Question", ["Topic"], false, " → ")).toBe("Question");
	});

	it("leaves the question unchanged when there are no parents", () => {
		expect(formatCardFront("Question", [], true, " → ")).toBe("Question");
	});
});

describe("formatCardContext", () => {
	it("joins parent headings only", () => {
		expect(formatCardContext(["A", "B"], true, " → ")).toBe("A → B");
	});
});

describe("deckNameFromVaultPath", () => {
	it("turns folders and the note name into an Anki nested deck", () => {
		expect(deckNameFromVaultPath("Civ Pro/Personal Jurisdiction.md")).toBe(
			"Civ Pro::Personal Jurisdiction",
		);
	});

	it("uses the note name for a vault-root file", () => {
		expect(deckNameFromVaultPath("Torts.md")).toBe("Torts");
	});

	it("prepends an optional root deck", () => {
		expect(deckNameFromVaultPath("Civ Pro/PJ.md", "Law School")).toBe("Law School::Civ Pro::PJ");
	});
});
