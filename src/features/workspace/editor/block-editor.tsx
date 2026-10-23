import type { PartialBlock } from "@blocknote/core";
import { en } from "@blocknote/core/locales";
import { withCollaboration } from "@blocknote/core/yjs";
import { BlockNoteView, lightDefaultTheme } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/mantine/style.css";
import "./block-editor.css";
import type { SharedDocument } from "../collaboration/collaboration";
import { fromEditorBlocks, toEditorBlocks } from "./editor-content";

export interface BlockEditorProps {
	initialContent: unknown;
	readOnly: boolean;
	onChange: (content: unknown) => void;
	/** Binds the editor to a shared document instead of `initialContent`. */
	shared?: SharedDocument;
}

const placeholder = "Start writing your notes… Type / to insert a block.";

const editorTheme = {
	...lightDefaultTheme,
	fontFamily: "var(--font-sans)",
	colors: {
		...lightDefaultTheme.colors,
		editor: { text: "var(--color-ink)", background: "#ffffff" },
		selected: { text: "#ffffff", background: "var(--color-primary)" },
	},
};

const baseOptions = {
	dictionary: {
		...en,
		placeholders: { ...en.placeholders, default: placeholder },
	},
	domAttributes: {
		editor: {
			"aria-label": "Page content",
			"aria-placeholder": placeholder,
		},
	},
};

/**
 * The page editor (BlockNote). Personal pages load and save JSON blocks through
 * `onChange`; shared pages edit the collaborative document directly and never
 * call `onChange`, since the collaboration server stores them.
 */
export function BlockEditor(props: BlockEditorProps) {
	return (
		<div className="workspace-block-editor rounded-xl border border-border bg-white py-5 transition-shadow focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 sm:py-6">
			{props.shared ? (
				<SharedEditor shared={props.shared} readOnly={props.readOnly} />
			) : (
				<PersonalEditor {...props} />
			)}
		</div>
	);
}

function PersonalEditor({
	initialContent,
	readOnly,
	onChange,
}: BlockEditorProps) {
	const editor = useCreateBlockNote({
		...baseOptions,
		initialContent: toEditorBlocks(initialContent),
	});

	return (
		<BlockNoteView
			editor={editor}
			theme={editorTheme}
			editable={!readOnly}
			onChange={() =>
				onChange(fromEditorBlocks(editor.document as PartialBlock[]))
			}
		/>
	);
}

function SharedEditor({
	shared,
	readOnly,
}: {
	shared: SharedDocument;
	readOnly: boolean;
}) {
	const editor = useCreateBlockNote(
		withCollaboration({
			...baseOptions,
			collaboration: {
				fragment: shared.fragment,
				provider: { awareness: shared.awareness },
				user: { ...shared.user },
				showCursorLabels: "activity",
			},
		}),
		[shared],
	);

	return (
		<BlockNoteView editor={editor} theme={editorTheme} editable={!readOnly} />
	);
}
