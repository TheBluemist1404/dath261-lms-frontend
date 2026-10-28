import { Button } from "@/components/ui/button";
import type { SaveStatus } from "../hooks/use-page-autosave";

const labels: Record<SaveStatus, { title: string; detail: string }> = {
	idle: { title: "Saved", detail: "All changes saved" },
	pending: { title: "Editing", detail: "Changes will save shortly" },
	saving: { title: "Saving", detail: "Saving your changes…" },
	saved: { title: "Saved", detail: "All changes saved" },
	failed: { title: "Failed", detail: "Save failed · Retry" },
};

export function SaveStatusIndicator({
	status,
	onRetry,
}: {
	status: SaveStatus;
	onRetry: () => void;
}) {
	const label = labels[status];

	return (
		<div className="space-y-4">
			<output
				aria-live="polite"
				className="flex w-fit flex-col rounded-lg border border-border bg-white px-4 py-2 text-sm"
			>
				<span className="font-semibold">{label.title}</span>
				<span className="text-muted">{label.detail}</span>
			</output>
			{status === "failed" && (
				<div
					role="alert"
					className="flex flex-col items-start gap-3 rounded-lg bg-amber-50 p-4 text-sm text-amber-900"
				>
					<div>
						<p className="font-semibold">Changes could not be saved</p>
						<p className="mt-1">
							Your edits are kept on this page. Retry to save them.
						</p>
					</div>
					<Button onClick={onRetry}>Retry saving</Button>
				</div>
			)}
		</div>
	);
}
