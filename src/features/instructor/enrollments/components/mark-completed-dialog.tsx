import { useEffect, useRef } from "react";
import type { EnrollmentRosterItem } from "../types/instructor-enrollment.types";

interface MarkCompletedDialogProps {
	student: EnrollmentRosterItem | null;
	busy?: boolean;
	error?: string | null;
	onClose: () => void;
	onConfirm: () => void;
}

function studentName(student: EnrollmentRosterItem) {
	const name = [student.student.firstName, student.student.lastName]
		.filter(Boolean)
		.join(" ")
		.trim();
	return name || student.student.email;
}

export function MarkCompletedDialog({
	student,
	busy = false,
	error,
	onClose,
	onConfirm,
}: MarkCompletedDialogProps) {
	const ref = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = ref.current;
		if (!dialog) return;

		if (student && !dialog.open) dialog.showModal();
		if (!student && dialog.open) dialog.close();
	}, [student]);

	return (
		<dialog
			ref={ref}
			onClose={onClose}
			className="m-auto w-[calc(100%-2rem)] max-w-[520px] rounded-2xl border border-border bg-white p-6 text-ink backdrop:bg-ink/40"
		>
			<div className="flex flex-col gap-4">
				<div>
					<h2 className="font-heading text-xl font-bold">
						Mark student completed?
					</h2>
					<p className="mt-2 text-sm leading-6 text-muted">
						{student
							? `This will mark ${studentName(student)} as Completed. This action is only available for ACTIVE enrollments.`
							: ""}
					</p>
				</div>

				{error && (
					<p role="alert" className="text-sm text-error">
						{error}
					</p>
				)}

				<div className="flex justify-end gap-3">
					<button
						type="button"
						className="min-h-10 rounded-lg border border-border px-4 text-sm font-semibold disabled:opacity-50"
						disabled={busy}
						onClick={onClose}
					>
						Cancel
					</button>
					<button
						type="button"
						className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
						disabled={busy || !student}
						onClick={onConfirm}
					>
						{busy ? "Completing…" : "Confirm completed"}
					</button>
				</div>
			</div>
		</dialog>
	);
}
