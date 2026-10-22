import { type ReactNode, useEffect, useId, useRef } from "react";

export interface DialogProps {
	open: boolean;
	/** Called when the dialog closes, including from Escape. */
	onClose: () => void;
	title: string;
	description?: ReactNode;
	children?: ReactNode;
}

/** Modal built on the native <dialog>, which provides focus trapping and Escape. */
export function Dialog({
	open,
	onClose,
	title,
	description,
	children,
}: DialogProps) {
	const ref = useRef<HTMLDialogElement>(null);
	const titleId = useId();
	const descriptionId = useId();

	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);

	return (
		<dialog
			ref={ref}
			aria-labelledby={titleId}
			aria-describedby={description ? descriptionId : undefined}
			onClose={onClose}
			className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-border bg-white p-6 text-ink shadow-xl backdrop:bg-ink/40"
		>
			<div className="space-y-5">
				<h2 id={titleId} className="font-heading text-2xl font-semibold">
					{title}
				</h2>
				{description && (
					<p id={descriptionId} className="text-sm leading-6 text-muted">
						{description}
					</p>
				)}
				{children}
			</div>
		</dialog>
	);
}
