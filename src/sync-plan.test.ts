import { describe, expect, it } from "vitest";
import { cardTagFromNoteTags, cardOwnershipTag } from "./ownership";
import { planFileSync, type DesiredCard, type ExistingNote } from "./sync-plan";

function card(tag: string, front: string, back = "back"): DesiredCard {
	return { cardTag: tag, front, back, context: "ctx" };
}

function note(id: number, front: string, tags: string[], cardIds: number[] = [id]): ExistingNote {
	return { id, front, tags, cardIds };
}

describe("planFileSync", () => {
	it("updates notes that share a card tag and preserves their ids", () => {
		const tag = cardOwnershipTag("a.md", ["H"], "Q", 0);
		const plan = planFileSync(
			[card(tag, "H → Q", "new back")],
			[note(11, "old front", ["obsidian", tag])],
			cardTagFromNoteTags,
			true,
		);
		expect(plan.toCreate).toEqual([]);
		expect(plan.toDelete).toEqual([]);
		expect(plan.toUpdate).toEqual([
			{
				id: 11,
				card: card(tag, "H → Q", "new back"),
				cardIds: [11],
			},
		]);
	});

	it("creates notes that are not in Anki yet", () => {
		const tag = cardOwnershipTag("a.md", [], "New", 0);
		const plan = planFileSync([card(tag, "New")], [], cardTagFromNoteTags, true);
		expect(plan.toCreate).toHaveLength(1);
		expect(plan.toUpdate).toEqual([]);
		expect(plan.toDelete).toEqual([]);
	});

	it("deletes Anki notes that are no longer in the file", () => {
		const gone = cardOwnershipTag("a.md", [], "Gone", 0);
		const stay = cardOwnershipTag("a.md", [], "Stay", 0);
		const plan = planFileSync(
			[card(stay, "Stay")],
			[note(1, "Gone", ["obsidian", gone]), note(2, "Stay", ["obsidian", stay])],
			cardTagFromNoteTags,
			true,
		);
		expect(plan.toDelete).toEqual([1]);
		expect(plan.toUpdate.map((item) => item.id)).toEqual([2]);
		expect(plan.toCreate).toEqual([]);
	});

	it("does not delete missing notes when that setting is off", () => {
		const gone = cardOwnershipTag("a.md", [], "Gone", 0);
		const plan = planFileSync(
			[],
			[note(1, "Gone", ["obsidian", gone])],
			cardTagFromNoteTags,
			false,
		);
		expect(plan.toDelete).toEqual([]);
	});

	it("adopts legacy notes with no card tag by matching Front", () => {
		const tag = cardOwnershipTag("a.md", [], "Question", 0);
		const plan = planFileSync(
			[card(tag, "Question", "updated")],
			[note(5, "Question", ["obsidian", "obsidian-file-abc"])],
			cardTagFromNoteTags,
			true,
		);
		expect(plan.toUpdate[0]?.id).toBe(5);
		expect(plan.toCreate).toEqual([]);
		expect(plan.toDelete).toEqual([]);
	});
});
