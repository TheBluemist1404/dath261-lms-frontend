import { describe, expect, it } from "vitest";
import {
	buildPageTree,
	flattenPageTree,
	getAncestors,
	getDescendantIds,
} from "./page-tree";
import type { PageSummary } from "./types";

function page(id: string, parentPageId: string | null = null): PageSummary {
	return {
		id,
		parentPageId,
		workspaceId: "ws",
		title: id,
		createdAt: "",
		updatedAt: "",
	};
}

const pages = [
	page("a"),
	page("a1", "a"),
	page("a1x", "a1"),
	page("b"),
	page("a2", "a"),
];

describe("page tree helpers", () => {
	it("nests pages under their parents in API order", () => {
		expect(
			flattenPageTree(buildPageTree(pages)).map(
				({ page, depth }) => `${depth}:${page.id}`,
			),
		).toEqual(["0:a", "1:a1", "2:a1x", "1:a2", "0:b"]);
	});

	it("treats a page whose parent is missing as a root", () => {
		expect(
			buildPageTree([page("orphan", "gone")]).map((node) => node.page.id),
		).toEqual(["orphan"]);
	});

	it("finds ancestors root-first and every descendant", () => {
		expect(getAncestors(pages, "a1x").map((entry) => entry.id)).toEqual([
			"a",
			"a1",
		]);
		expect([...getDescendantIds(pages, "a")].sort()).toEqual([
			"a1",
			"a1x",
			"a2",
		]);
		expect(getDescendantIds(pages, "b").size).toBe(0);
	});
});
