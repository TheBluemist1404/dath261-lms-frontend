import { useId, useState } from "react";

/**
 * Contract between the page view and the editor component. The editor owns the
 * shape of `content`; the page view only stores and saves it.
 */
export interface EditorSlotProps {
	pageId: string;
	initialContent: unknown;
	readOnly: boolean;
	onChange: (content: unknown) => void;
}

interface PlainTextContent {
	type: "plain-text";
	text: string;
}

function readPlainText(content: unknown) {
	const candidate = content as Partial<PlainTextContent> | null;
	return candidate?.type === "plain-text" && typeof candidate.text === "string"
		? candidate.text
		: "";
}

/**
 * Stand-in until the real editor is wired in: a textarea that stores
 * `{ type: "plain-text", text }`. Swap this component, keep the props.
 */
export function EditorSlot({
	initialContent,
	readOnly,
	onChange,
}: EditorSlotProps) {
	const id = useId();
	const [text, setText] = useState(() => readPlainText(initialContent));

	return (
		<div>
			<label htmlFor={id} className="sr-only">
				Page content
			</label>
			<textarea
				id={id}
				value={text}
				readOnly={readOnly}
				placeholder={readOnly ? "This page is empty." : "Start with an idea…"}
				onChange={(event) => {
					setText(event.target.value);
					onChange({ type: "plain-text", text: event.target.value });
				}}
				className="min-h-80 w-full resize-y rounded-lg border border-border bg-white p-4 text-base leading-7 read-only:bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
			/>
		</div>
	);
}
