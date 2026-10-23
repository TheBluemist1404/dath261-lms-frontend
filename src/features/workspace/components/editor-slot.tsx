import { lazy, Suspense } from "react";
import type { SharedDocument } from "../collaboration/collaboration";

/**
 * Contract between the page view and the editor component. The editor owns the
 * shape of `content`; the page view only stores and saves it. Shared pages pass
 * `shared` and are saved by the collaboration server instead.
 */
export interface EditorSlotProps {
	pageId: string;
	initialContent: unknown;
	readOnly: boolean;
	onChange: (content: unknown) => void;
	shared?: SharedDocument;
}

// BlockNote is large; load it with the first page rather than the app shell.
const BlockEditor = lazy(() =>
	import("../editor/block-editor").then((module) => ({
		default: module.BlockEditor,
	})),
);

export function EditorSlot({ pageId, ...props }: EditorSlotProps) {
	return (
		<Suspense
			fallback={
				<output className="block min-h-60 rounded-xl border border-border p-6 text-sm text-muted">
					Loading editor…
				</output>
			}
		>
			<BlockEditor key={pageId} {...props} />
		</Suspense>
	);
}
