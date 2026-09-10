import { describe, expect, it } from "vitest";
import {
	deckNameFromVaultPath,
	formatCardFront,
	markdownToAnkiHtml,
} from "./format";

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

describe("markdownToAnkiHtml", () => {
	it("turns numbered lists into ordered HTML lists", () => {
		expect(
			markdownToAnkiHtml(`1. First requirement
2. Second requirement
3. Third requirement`),
		).toBe(
			"<ol><li>First requirement</li><li>Second requirement</li><li>Third requirement</li></ol>",
		);
	});

	it("turns bullet lists into unordered HTML lists", () => {
		expect(markdownToAnkiHtml(`- Alpha\n- Beta`)).toBe("<ul><li>Alpha</li><li>Beta</li></ul>");
	});

	it("keeps newlines inside a paragraph", () => {
		expect(markdownToAnkiHtml("Line one\nLine two")).toBe("<p>Line one<br>Line two</p>");
	});

	it("keeps wrapped lines on a list item", () => {
		expect(
			markdownToAnkiHtml(`1. Minimum contacts
   with the forum
2. Fair play`),
		).toBe("<ol><li>Minimum contacts<br>with the forum</li><li>Fair play</li></ol>");
	});

	it("separates paragraphs around lists", () => {
		expect(markdownToAnkiHtml("Intro.\n\n1. One\n2. Two\n\nOutro.")).toBe(
			"<p>Intro.</p><ol><li>One</li><li>Two</li></ol><p>Outro.</p>",
		);
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
