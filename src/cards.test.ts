import { describe, expect, it } from "vitest";
import { desiredCardsForFile } from "./cards";
import { cardOwnershipTag } from "./ownership";

const settings = {
	includeHierarchy: false,
	hierarchySeparator: " → ",
};

describe("desiredCardsForFile", () => {
	it("emits one Anki note for a one-way #card", () => {
		const desired = desiredCardsForFile(
			"a.md",
			[{ front: "Q", back: "A", hierarchy: [], reversed: false }],
			settings,
		);
		expect(desired).toHaveLength(1);
		expect(desired[0]?.cardTag).toBe(cardOwnershipTag("a.md", [], "Q", 0, "fwd"));
		expect(desired[0]?.front).toContain("Q");
		expect(desired[0]?.back).toContain("A");
	});

	it("emits question→answer and answer→question notes for #card-reversed", () => {
		const desired = desiredCardsForFile(
			"a.md",
			[{ front: "Q", back: "A", hierarchy: [], reversed: true }],
			settings,
		);
		expect(desired).toHaveLength(2);
		expect(desired[0]?.front).toContain("Q");
		expect(desired[0]?.back).toContain("A");
		expect(desired[1]?.front).toContain("A");
		expect(desired[1]?.back).toContain("Q");
		expect(desired[0]?.cardTag).not.toBe(desired[1]?.cardTag);
		expect(desired[1]?.cardTag).toBe(cardOwnershipTag("a.md", [], "Q", 0, "rev"));
	});

	it("keeps the forward note id the same as a one-way card", () => {
		const oneWay = desiredCardsForFile(
			"a.md",
			[{ front: "Q", back: "A", hierarchy: [], reversed: false }],
			settings,
		);
		const reversed = desiredCardsForFile(
			"a.md",
			[{ front: "Q", back: "A", hierarchy: [], reversed: true }],
			settings,
		);
		expect(reversed[0]?.cardTag).toBe(oneWay[0]?.cardTag);
	});

	it("puts parent headings on the Front field", () => {
		const desired = desiredCardsForFile(
			"a.md",
			[
				{
					front: "What is X?",
					back: "Y",
					hierarchy: ["Civ Pro", "PJ"],
					reversed: false,
				},
			],
			{ includeHierarchy: true, hierarchySeparator: " → " },
		);
		expect(desired[0]?.front).toContain("Civ Pro → PJ → What is X?");
		expect(desired[0]?.back).not.toContain("Civ Pro → PJ");
	});
});
