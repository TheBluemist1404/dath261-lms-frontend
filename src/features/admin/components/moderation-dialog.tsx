import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { ActionButton } from "./admin-page";

// Figma AD-OV dialogs (Dismiss report, Suspend/Restore user, Suspend/Restore
// course): 560px wide, radius 16, padding 24, gap 16, with a required reason.

const defaultReason = "Reviewed the report and target context.";

export interface ModerationDialogProps {
	open: boolean;
	title: string;
	description: string;
	confirmLabel: string;
	tone: "primary" | "danger";
	busy?: boolean;
	error?: string | null;
	onClose: () => void;
	onConfirm: (reason: string) => void;
}

export function ModerationDialog({
	open,
	title,
	description,
	confirmLabel,
	tone,
	busy = false,
	error,
	onClose,
	onConfirm,
}: ModerationDialogProps) {
	const ref = useRef<HTMLDialogElement>(null);
	const titleId = useId();
	const descriptionId = useId();
	const reasonId = useId();
	const [reason, setReason] = useState(defaultReason);

	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;
		if (open && !dialog.open) {
			setReason(defaultReason);
			dialog.showModal();
		}
		if (!open && dialog.open) dialog.close();
	}, [open]);

	function submit(event: FormEvent) {
		event.preventDefault();
		const trimmed = reason.trim();
		if (trimmed) onConfirm(trimmed);
	}

	return (
		<dialog
			ref={ref}
			aria-labelledby={titleId}
			aria-describedby={descriptionId}
			onClose={onClose}
			className="m-auto w-[calc(100%-2rem)] max-w-[560px] rounded-2xl border border-border bg-white p-6 text-ink backdrop:bg-ink/40"
		>
			<form onSubmit={submit} className="flex flex-col gap-4">
				<div className="flex items-start justify-between gap-4">
					<h2 id={titleId} className="text-xl leading-7">
						{title}
					</h2>
					<button
						type="button"
						aria-label="Close"
						onClick={onClose}
						className="flex size-8 items-center justify-center rounded-lg text-xl leading-none text-muted hover:bg-subtle"
					>
						<span aria-hidden="true">×</span>
					</button>
				</div>
				<p id={descriptionId} className="text-sm text-muted">
					{description}
				</p>
				<div className="flex flex-col gap-2">
					<label htmlFor={reasonId} className="text-xs font-semibold">
						Reason
					</label>
					<textarea
						id={reasonId}
						value={reason}
						onChange={(event) => setReason(event.target.value)}
						rows={4}
						required
						className="w-full resize-y rounded-lg border border-border px-3 py-2 text-sm outline-none focus-visible:outline-2 focus-visible:outline-primary"
					/>
				</div>
				{error && (
					<p role="alert" className="text-sm text-error">
						{error}
					</p>
				)}
				<div className="grid grid-cols-2 gap-3">
					<ActionButton tone="outline" onClick={onClose} disabled={busy}>
						Cancel
					</ActionButton>
					<ActionButton type="submit" tone={tone} disabled={busy}>
						{confirmLabel}
					</ActionButton>
				</div>
			</form>
		</dialog>
	);
}
