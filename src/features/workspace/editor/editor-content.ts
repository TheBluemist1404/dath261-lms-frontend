import type { PartialBlock } from "@blocknote/core";

/** How personal pages store editor content through the REST API. */
export interface BlockNoteContent {
	type: "blocknote";
	blocks: PartialBlock[];
}

/**
 * Blocks to open the editor with. Earlier pages hold `{ type: "plain-text" }`
 * from the stand-in editor; each of their lines becomes a paragraph. Returns
 * undefined for an empty page so the editor starts with its own empty block.
 */
export function toEditorBlocks(content: unknown): PartialBlock[] | undefined {
	const candidate = content as {
		type?: unknown;
		blocks?: unknown;
		text?: unknown;
	} | null;
	if (
		candidate?.type === "blocknote" &&
		Array.isArray(candidate.blocks) &&
		candidate.blocks.length > 0
	) {
		return candidate.blocks as PartialBlock[];
	}
	if (
		candidate?.type === "plain-text" &&
		typeof candidate.text === "string" &&
		candidate.text
	) {
		return candidate.text
			.split(/\r?\n/)
			.map((line) => ({ type: "paragraph", content: line }));
	}
	return undefined;
}

export function fromEditorBlocks(blocks: PartialBlock[]): BlockNoteContent {
	return { type: "blocknote", blocks };
}
