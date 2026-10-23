import { useEffect, useId, useState } from "react";
import { sharedDocumentText } from "../collaboration/shared-document";
import type { BlockEditorProps } from "../editor/block-editor";

function readPlainText(content: unknown) {
	const candidate = content as { type?: unknown; text?: unknown } | null;
	return candidate?.type === "plain-text" && typeof candidate.text === "string"
		? candidate.text
		: "";
}

/**
 * Test stand-in for the BlockNote editor, which jsdom cannot type into: a
 * textarea that saves `{ type: "plain-text", text }`. Shared pages show the
 * shared document's text and keep edits local.
 */
export function BlockEditor({
	initialContent,
	readOnly,
	onChange,
	shared,
}: BlockEditorProps) {
	const id = useId();
	const [text, setText] = useState(() =>
		shared
			? sharedDocumentText(shared.fragment)
			: readPlainText(initialContent),
	);

	useEffect(() => {
		if (!shared) return;
		const sync = () => setText(sharedDocumentText(shared.fragment));
		shared.fragment.observeDeep(sync);
		return () => shared.fragment.unobserveDeep(sync);
	}, [shared]);

	return (
		<div>
			<label htmlFor={id} className="sr-only">
				Page content
			</label>
			<textarea
				id={id}
				value={text}
				readOnly={readOnly}
				onChange={(event) => {
					setText(event.target.value);
					if (!shared)
						onChange({ type: "plain-text", text: event.target.value });
				}}
			/>
		</div>
	);
}
