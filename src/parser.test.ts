import { describe, expect, it } from "vitest";
import {
	headingHasCardTag,
	parseCards,
	stripCardTag,
	stripCardTags,
	stripYamlFrontmatter,
} from "./parser";

const SAMPLE = `# Civil Procedure

## Personal Jurisdiction

### Minimum Contacts

#### What is purposeful availment? #card

A defendant purposefully directs activity toward the forum state.

#### What is the effects test? #card

Intentional conduct expressly aimed at the forum may establish contacts.
`;

describe("headingHasCardTag", () => {
	it("matches #card as a whole token", () => {
		expect(headingHasCardTag("What is X? #card", "#card")).toBe(true);
		expect(headingHasCardTag("#card", "#card")).toBe(true);
		expect(headingHasCardTag("Q #card extra", "#card")).toBe(true);
	});

	it("does not match #cardio", () => {
		expect(headingHasCardTag("What is cardio? #cardio", "#card")).toBe(false);
		expect(headingHasCardTag("#cardio", "#card")).toBe(false);
	});

	it("ignores the token in the middle of a word", () => {
		expect(headingHasCardTag("postcard", "#card")).toBe(false);
	});
});

describe("stripCardTag", () => {
	it("removes #card from the heading", () => {
		expect(stripCardTag("What is purposeful availment? #card", "#card")).toBe(
			"What is purposeful availment?",
		);
	});

	it("removes #card-reversed before #card", () => {
		expect(stripCardTags("What is X? #card-reversed", "#card")).toBe("What is X?");
	});
});

describe("stripYamlFrontmatter", () => {
	it("removes YAML frontmatter", () => {
		const md = `---
title: Notes
---
# Heading
`;
		expect(stripYamlFrontmatter(md)).toBe("# Heading\n");
	});

	it("leaves markdown without frontmatter unchanged", () => {
		expect(stripYamlFrontmatter("# Hello")).toBe("# Hello");
	});
});

describe("parseCards", () => {
	it("parses the spec sample into two cards with hierarchy", () => {
		expect(parseCards(SAMPLE)).toEqual([
			{
				front: "What is purposeful availment?",
				back: "A defendant purposefully directs activity toward the forum state.",
				hierarchy: ["Civil Procedure", "Personal Jurisdiction", "Minimum Contacts"],
				reversed: false,
			},
			{
				front: "What is the effects test?",
				back: "Intentional conduct expressly aimed at the forum may establish contacts.",
				hierarchy: ["Civil Procedure", "Personal Jurisdiction", "Minimum Contacts"],
				reversed: false,
			},
		]);
	});

	it("stops the back at an equal-level heading", () => {
		const md = `#### First question #card

First answer.

#### Not a card

This is the next section.
`;
		expect(parseCards(md)).toEqual([
			{
				front: "First question",
				back: "First answer.",
				hierarchy: [],
				reversed: false,
			},
		]);
	});

	it("stops the back at a higher-level heading", () => {
		const md = `## Topic

#### Question #card

Answer.

## Next topic

More notes.
`;
		expect(parseCards(md)[0]).toEqual({
			front: "Question",
			back: "Answer.",
			hierarchy: ["Topic"],
			reversed: false,
		});
	});

	it("includes lower-level non-card headings in the back", () => {
		const md = `#### Question #card

Intro.

##### Details

More detail.
`;
		expect(parseCards(md)[0]?.back).toBe("Intro.\n\n##### Details\n\nMore detail.");
	});

	it("stops the back at a nested #card heading of any level", () => {
		const md = `#### Outer #card

Outer answer.

##### Inner #card

Inner answer.
`;
		expect(parseCards(md)).toEqual([
			{
				front: "Outer",
				back: "Outer answer.",
				hierarchy: [],
				reversed: false,
			},
			{
				front: "Inner",
				back: "Inner answer.",
				hierarchy: ["Outer"],
				reversed: false,
			},
		]);
	});

	it("ignores #card in body text", () => {
		const md = `#### Question #card

See also #card in the prose.

## Next
`;
		expect(parseCards(md)).toHaveLength(1);
		expect(parseCards(md)[0]?.back).toBe("See also #card in the prose.");
	});

	it("does not treat #cardio headings as cards", () => {
		const md = `#### What is cardio? #cardio

Not a flashcard.
`;
		expect(parseCards(md)).toEqual([]);
	});

	it("allows an empty back", () => {
		const md = `#### Empty back #card
#### Next #card

Has a back.
`;
		expect(parseCards(md)[0]).toEqual({
			front: "Empty back",
			back: "",
			hierarchy: [],
			reversed: false,
		});
	});

	it("skips YAML frontmatter when collecting cards", () => {
		const md = `---
tags:
  - law
---
#### Question #card

Answer.
`;
		expect(parseCards(md)).toEqual([
			{
				front: "Question",
				back: "Answer.",
				hierarchy: [],
				reversed: false,
			},
		]);
	});

	it("uses a custom card tag", () => {
		const md = `#### Custom #flash

Back.
`;
		expect(parseCards(md, "#flash")[0]?.front).toBe("Custom");
	});

	it("treats #card-reversed as a two-way card", () => {
		const md = `#### What is purposeful availment? #card-reversed

A defendant purposefully directs activity toward the forum state.
`;
		expect(parseCards(md)).toEqual([
			{
				front: "What is purposeful availment?",
				back: "A defendant purposefully directs activity toward the forum state.",
				hierarchy: [],
				reversed: true,
			},
		]);
	});

	it("does not treat #card-reversed as a one-way #card", () => {
		expect(headingHasCardTag("Q #card-reversed", "#card")).toBe(false);
	});

	it("stops the back at a nested #card-reversed heading", () => {
		const md = `#### Outer #card

Outer answer.

##### Inner #card-reversed

Inner answer.
`;
		expect(parseCards(md)).toEqual([
			{
				front: "Outer",
				back: "Outer answer.",
				hierarchy: [],
				reversed: false,
			},
			{
				front: "Inner",
				back: "Inner answer.",
				hierarchy: ["Outer"],
				reversed: true,
			},
		]);
	});

	it("uses <tag>-reversed for a custom card tag", () => {
		const md = `#### Custom #flash-reversed

Back.
`;
		expect(parseCards(md, "#flash")[0]).toMatchObject({
			front: "Custom",
			reversed: true,
		});
	});
});
