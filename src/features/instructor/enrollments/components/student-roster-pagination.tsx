interface StudentRosterPaginationProps {
	page: number;
	totalPages: number;
	hasPreviousPage: boolean;
	hasNextPage: boolean;
	onPrevious: () => void;
	onNext: () => void;
}

export function StudentRosterPagination({
	page,
	totalPages,
	hasPreviousPage,
	hasNextPage,
	onPrevious,
	onNext,
}: StudentRosterPaginationProps) {
	return (
		<div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
			<button
				type="button"
				className="min-h-9 rounded-lg border border-border px-3 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
				disabled={!hasPreviousPage}
				onClick={onPrevious}
			>
				Previous
			</button>

			<span className="text-muted">
				Page {page} of {Math.max(totalPages, 1)}
			</span>

			<button
				type="button"
				className="min-h-9 rounded-lg border border-border px-3 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
				disabled={!hasNextPage}
				onClick={onNext}
			>
				Next
			</button>
		</div>
	);
}
