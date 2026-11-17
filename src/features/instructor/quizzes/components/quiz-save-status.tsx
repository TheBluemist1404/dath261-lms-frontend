interface QuizSaveStatusProps {
	isDirty: boolean;
	isSaving: boolean;
	isError: boolean;
	isSuccess: boolean;
}

export function QuizSaveStatus({
	isDirty,
	isSaving,
	isError,
	isSuccess,
}: QuizSaveStatusProps) {
	if (isSaving) {
		return (
			<div className="rounded-lg border border-border bg-white px-4 py-3 text-sm font-semibold text-muted">
				Saving changes…
			</div>
		);
	}

	if (isError) {
		return (
			<div
				role="alert"
				className="rounded-lg border border-error/20 bg-white px-4 py-3 text-sm font-semibold text-error"
			>
				Unable to save changes.
			</div>
		);
	}

	if (isDirty) {
		return (
			<div className="rounded-lg border border-border bg-white px-4 py-3 text-sm font-semibold text-muted">
				Unsaved changes
			</div>
		);
	}

	if (isSuccess) {
		return (
			<div className="rounded-lg border border-primary/20 bg-primary-subtle px-4 py-3 text-sm font-semibold text-primary">
				Saved
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-border bg-white px-4 py-3 text-sm text-muted">
			All changes saved.
		</div>
	);
}
