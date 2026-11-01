import type { CourseStatus } from "../../types/course.types";

interface PublicationControlProps {
	status: CourseStatus;
	busy?: boolean;
	onChange: (status: CourseStatus) => void;
}

export function PublicationControl({
	status,
	busy = false,
	onChange,
}: PublicationControlProps) {
	const nextStatus = status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
	return (
		<div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-white p-4">
			<div className="mr-auto">
				<p className="text-sm font-semibold">Course publication</p>
				<p className="mt-1 text-sm text-muted">
					{status === "PUBLISHED"
						? "Learners can access this course according to enrollment rules."
						: "This course is currently a draft."}
				</p>
			</div>
			<span
				className={`rounded-full px-3 py-1 text-xs font-semibold ${status === "PUBLISHED" ? "bg-primary-subtle text-primary" : "bg-subtle text-muted"}`}
			>
				{status === "PUBLISHED" ? "Published" : "Draft"}
			</span>
			<button
				type="button"
				disabled={busy}
				onClick={() => onChange(nextStatus)}
				className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60"
			>
				{busy
					? "Saving…"
					: status === "PUBLISHED"
						? "Unpublish course"
						: "Publish course"}
			</button>
		</div>
	);
}
