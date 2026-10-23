import { describe, expect, it } from "vitest";
import { fromEditorBlocks, toEditorBlocks } from "./editor-content";

describe("editor content", () => {
	it("opens stored BlockNote documents as they are", () => {
		const blocks = [{ type: "heading" as const, content: "Title" }];
		expect(toEditorBlocks(fromEditorBlocks(blocks))).toBe(blocks);
	});

	it("turns plain-text pages into one paragraph per line", () => {
		expect(
			toEditorBlocks({ type: "plain-text", text: "First\n\nThird" }),
		).toEqual([
			{ type: "paragraph", content: "First" },
			{ type: "paragraph", content: "" },
			{ type: "paragraph", content: "Third" },
		]);
	});

	it("starts empty pages with the editor's own empty block", () => {
		expect(toEditorBlocks(null)).toBeUndefined();
		expect(toEditorBlocks({ type: "plain-text", text: "" })).toBeUndefined();
		expect(toEditorBlocks({ type: "blocknote", blocks: [] })).toBeUndefined();
		expect(toEditorBlocks({ type: "unknown" })).toBeUndefined();
	});
});
