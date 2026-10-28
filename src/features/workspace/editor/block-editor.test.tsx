import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Awareness } from "y-protocols/awareness";
import * as Y from "yjs";
import { renderWithProviders } from "@/test/render";
import { workspaceKeys } from "../api/workspace.queries";
import type { SharedDocument } from "../collaboration/collaboration";
import {
	DOCUMENT_FRAGMENT,
	seedSharedDocument,
} from "../collaboration/shared-document";
import type { CourseReference } from "../types";
import { BlockEditor } from "./block-editor";

// The setup file swaps this module for a textarea double; cover the real one here.
vi.unmock("@/features/workspace/editor/block-editor");

// Mantine reads the color scheme through matchMedia, which jsdom lacks.
window.matchMedia ??= (query: string) =>
	({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		addListener: () => {},
		removeListener: () => {},
		dispatchEvent: () => false,
	}) as MediaQueryList;

const editorElement = () =>
	screen.findByRole("textbox", { name: "Page content" });

function sharedDocument(text: string): SharedDocument & { doc: Y.Doc } {
	const doc = seedSharedDocument(text);
	return {
		doc,
		fragment: doc.getXmlFragment(DOCUMENT_FRAGMENT),
		awareness: new Awareness(doc),
		user: { id: "user-1", name: "Alex Le", color: "#0f766e" },
	};
}

describe("BlockEditor", () => {
	it("opens plain-text pages as paragraph blocks", async () => {
		render(
			<BlockEditor
				initialContent={{ type: "plain-text", text: "First idea\nSecond idea" }}
				pageId="page-1"
				destination="Group / Page"
				readOnly={false}
				onChange={() => {}}
			/>,
		);

		const editor = await editorElement();
		expect(editor).toHaveAttribute("contenteditable", "true");
		const paragraphs = editor.querySelectorAll("p");
		expect([...paragraphs].map((node) => node.textContent)).toEqual([
			"First idea",
			"Second idea",
		]);
	});

	it("opens saved BlockNote documents, including headings", async () => {
		render(
			<BlockEditor
				initialContent={{
					type: "blocknote",
					blocks: [
						{ type: "heading", props: { level: 2 }, content: "Scheduling" },
						{ type: "bulletListItem", content: "Round robin" },
					],
				}}
				pageId="page-1"
				destination="Group / Page"
				readOnly
				onChange={() => {}}
			/>,
		);

		const editor = await editorElement();
		expect(editor).toHaveAttribute("contenteditable", "false");
		expect(editor.querySelector("h2")).toHaveTextContent("Scheduling");
		expect(editor).toHaveTextContent("Round robin");
	});

	it("shows the shared document and follows remote edits", async () => {
		const shared = sharedDocument("Seeded by the server");
		render(
			<BlockEditor
				initialContent={{
					type: "plain-text",
					text: "Ignored for shared pages",
				}}
				pageId="page-1"
				destination="Group / Page"
				readOnly={false}
				onChange={() => {}}
				shared={shared}
			/>,
		);

		const editor = await editorElement();
		expect(editor).toHaveTextContent("Seeded by the server");
		expect(editor).not.toHaveTextContent("Ignored for shared pages");

		// Another member's edit arrives as a Yjs update.
		const remote = new Y.Doc();
		Y.applyUpdate(remote, Y.encodeStateAsUpdate(shared.doc));
		const paragraph = (
			(remote.getXmlFragment(DOCUMENT_FRAGMENT).get(0) as Y.XmlElement).get(
				0,
			) as Y.XmlElement
		).get(0) as Y.XmlElement;
		(paragraph.get(0) as Y.XmlText).insert(0, "Edited · ");
		act(() => {
			Y.applyUpdate(
				shared.doc,
				Y.encodeStateAsUpdate(remote, Y.encodeStateVector(shared.doc)),
			);
		});

		await waitFor(() =>
			expect(editor).toHaveTextContent("Edited · Seeded by the server"),
		);
	});

	it("can be read-only on shared pages", async () => {
		render(
			<BlockEditor
				initialContent={null}
				pageId="page-1"
				destination="Group / Page"
				readOnly
				onChange={() => {}}
				shared={sharedDocument("Archived notes")}
			/>,
		);

		const editor = await editorElement();
		expect(editor).toHaveAttribute("contenteditable", "false");
		expect(editor).toHaveTextContent("Archived notes");
	});

	it("shows course references placed in the page text", async () => {
		const references: CourseReference[] = [
			{
				id: "ref-1",
				pageId: "page-1",
				createdAt: "2026-10-01T00:00:00.000Z",
				status: "AVAILABLE",
				timestampSeconds: 95,
				block: {
					id: "block-1",
					type: "VIDEO",
					title: "Lecture 3: Scheduling",
					courseId: "course-1",
					courseTitle: "Operating Systems",
					durationSeconds: 3600,
				},
			},
			{
				id: "ref-2",
				pageId: "page-1",
				createdAt: "2026-10-01T00:00:00.000Z",
				status: "LOCKED",
			},
		];
		const { queryClient } = renderWithProviders(
			<BlockEditor
				initialContent={{
					type: "blocknote",
					blocks: [
						{ type: "paragraph", content: "Before" },
						{ type: "courseReference", props: { referenceId: "ref-1" } },
						{ type: "courseReference", props: { referenceId: "ref-2" } },
					],
				}}
				pageId="page-1"
				destination="Group / Page"
				readOnly
				onChange={() => {}}
			/>,
		);
		queryClient.setQueryData(workspaceKeys.references("page-1"), references);

		const editor = await editorElement();
		await waitFor(() =>
			expect(editor).toHaveTextContent("Lecture 3: Scheduling"),
		);
		expect(editor).toHaveTextContent("Starts at 1:35");
		expect(editor).toHaveTextContent("Protected reference");
	});
});
