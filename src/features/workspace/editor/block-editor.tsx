import {
	BlockNoteSchema,
	defaultBlockSpecs,
	type PartialBlock,
} from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import { en } from "@blocknote/core/locales";
import { withCollaboration } from "@blocknote/core/yjs";
import { BlockNoteView, lightDefaultTheme } from "@blocknote/mantine";
import {
	getDefaultReactSlashMenuItems,
	SuggestionMenuController,
	useCreateBlockNote,
} from "@blocknote/react";
import "@blocknote/mantine/style.css";
import "./block-editor.css";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { SharedDocument } from "../collaboration/collaboration";
import { ReferencePickerDialog } from "../components/reference-picker-dialog";
import type { CourseReference } from "../types";
import {
	courseReferenceBlock,
	ReferencesContext,
} from "./course-reference-block";
import { fromEditorBlocks, toEditorBlocks } from "./editor-content";

export interface BlockEditorProps {
	pageId: string;
	/** "Workspace / Page", shown in the course reference picker. */
	destination: string;
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

const schema = BlockNoteSchema.create({
	blockSpecs: { ...defaultBlockSpecs, courseReference: courseReferenceBlock() },
});
type PageEditor = typeof schema.BlockNoteEditor;

const baseOptions = {
	schema,
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
		<ReferencesContext.Provider value={{ pageId: props.pageId }}>
			<div className="workspace-block-editor rounded-xl border border-border bg-white py-5 transition-shadow focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 sm:py-6">
				{props.shared ? (
					<SharedEditor {...props} shared={props.shared} />
				) : (
					<PersonalEditor {...props} />
				)}
			</div>
		</ReferencesContext.Provider>
	);
}

function PersonalEditor({
	initialContent,
	onChange,
	...props
}: BlockEditorProps) {
	const editor = useCreateBlockNote({
		...baseOptions,
		initialContent: toEditorBlocks(initialContent),
	});

	return (
		<EditorView
			{...props}
			editor={editor}
			onChange={() =>
				onChange(fromEditorBlocks(editor.document as PartialBlock[]))
			}
		/>
	);
}

function SharedEditor({
	shared,
	onChange: _unused,
	...props
}: BlockEditorProps & { shared: SharedDocument }) {
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

	return <EditorView {...props} editor={editor} />;
}

/**
 * The editor surface with the slash menu, which adds "Course reference" to the
 * default blocks. Picking it opens the reference picker; the new reference is
 * placed where the slash command was typed.
 */
function EditorView({
	editor,
	pageId,
	destination,
	readOnly,
	onChange,
}: {
	editor: PageEditor;
	pageId: string;
	destination: string;
	readOnly: boolean;
	onChange?: () => void;
}) {
	const [target, setTarget] = useState<string | null>(null);

	const insertReference = (reference: CourseReference) => {
		const block = target ? editor.getBlock(target) : undefined;
		const inserted = {
			type: "courseReference" as const,
			props: { referenceId: reference.id },
		};
		const empty =
			block?.type === "paragraph" &&
			Array.isArray(block.content) &&
			block.content.length === 0;
		const anchor = block ?? editor.document[editor.document.length - 1];
		const [placed] =
			block && empty
				? editor.replaceBlocks([block], [inserted]).insertedBlocks
				: editor.insertBlocks([inserted], anchor, "after");
		if (!placed) return;

		// Keep writing below the reference, as after any other inserted block.
		const next =
			editor.getNextBlock(placed) ??
			editor.insertBlocks([{ type: "paragraph" }], placed, "after")[0];
		editor.setTextCursorPosition(next, "start");
		editor.focus();
	};

	return (
		<>
			<BlockNoteView
				editor={editor}
				theme={editorTheme}
				editable={!readOnly}
				onChange={onChange}
				slashMenu={false}
			>
				<SuggestionMenuController
					triggerCharacter="/"
					getItems={async (query) =>
						filterSuggestionItems(
							[
								...getDefaultReactSlashMenuItems(editor),
								{
									title: "Course reference",
									subtext: "Link a course file or video you can access",
									aliases: ["reference", "course", "file", "video"],
									group: "Course",
									icon: <Icon name="file" />,
									onItemClick: () =>
										setTarget(editor.getTextCursorPosition().block.id),
								},
							],
							query,
						)
					}
				/>
			</BlockNoteView>
			{!readOnly && (
				<ReferencePickerDialog
					open={target !== null}
					onClose={() => setTarget(null)}
					pageId={pageId}
					destination={destination}
					onCreated={insertReference}
				/>
			)}
		</>
	);
}
