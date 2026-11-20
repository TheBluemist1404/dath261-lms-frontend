import { useState } from "react";
import { getApiErrorMessage } from "@/lib/http/errors";
import {
	useCompleteEnrollment,
	useCourseRoster,
} from "../api/instructor-enrollment.queries";
import type { EnrollmentRosterItem } from "../types/instructor-enrollment.types";
import { MarkCompletedDialog } from "./mark-completed-dialog";
import { StudentProgressDetail } from "./student-progress-detail";
import {
	type RosterStatusFilter,
	StudentRosterFilters,
} from "./student-roster-filters";
import { StudentRosterPagination } from "./student-roster-pagination";
import { StudentRosterTable } from "./student-roster-table";

export function StudentRoster({ courseId }: { courseId: string }) {
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<RosterStatusFilter>("ALL");
	const [page, setPage] = useState(1);
	const [detailStudent, setDetailStudent] =
		useState<EnrollmentRosterItem | null>(null);
	const [completionStudent, setCompletionStudent] =
		useState<EnrollmentRosterItem | null>(null);

	const rosterQuery = useCourseRoster(courseId, {
		search: search.trim() || undefined,
		status: status === "ALL" ? undefined : status,
		page,
		limit: 20,
	});

	const completeMutation = useCompleteEnrollment();

	function changeSearch(value: string) {
		setSearch(value);
		setPage(1);
	}

	function changeStatus(value: RosterStatusFilter) {
		setStatus(value);
		setPage(1);
	}

	function closeDialog() {
		if (!completeMutation.isPending) {
			completeMutation.reset();
			setCompletionStudent(null);
		}
	}

	async function confirmCompletion() {
		if (!completionStudent) return;

		try {
			await completeMutation.mutateAsync({
				courseId,
				enrollmentId: completionStudent.enrollmentId,
			});
			setCompletionStudent(null);
			completeMutation.reset();
		} catch {
			// Mutation error is rendered by the dialog.
		}
	}

	if (detailStudent) {
		return (
			<StudentProgressDetail
				courseId={courseId}
				enrollmentId={detailStudent.enrollmentId}
				onBack={() => setDetailStudent(null)}
			/>
		);
	}

	return (
		<main className="flex flex-col gap-6 text-ink">
			<div>
				<p className="text-sm font-semibold text-primary">ENROLLMENTS</p>
				<h2 className="mt-1 font-heading text-2xl font-bold tracking-tight">
					Students
				</h2>
				<p className="mt-1 text-sm text-muted">
					View learner progress, quiz scores, and enrollment status.
				</p>
			</div>

			<section className="overflow-hidden rounded-xl border border-border bg-white">
				<StudentRosterFilters
					search={search}
					status={status}
					onSearchChange={changeSearch}
					onStatusChange={changeStatus}
				/>

				{rosterQuery.isPending ? (
					<p className="p-8 text-center text-sm text-muted">
						Loading students…
					</p>
				) : rosterQuery.isError ? (
					<div className="p-6" role="alert">
						<p className="text-sm text-error">
							Unable to load students: {rosterQuery.error.message}
						</p>
						<button
							type="button"
							className="mt-3 min-h-10 rounded-lg border border-border px-3 text-sm font-semibold"
							onClick={() => void rosterQuery.refetch()}
						>
							Retry
						</button>
					</div>
				) : rosterQuery.data.data.length === 0 ? (
					<div className="p-10 text-center">
						<h3 className="font-semibold">No students found</h3>
						<p className="mt-1 text-sm text-muted">
							Try a different search or status filter.
						</p>
					</div>
				) : (
					<>
						<StudentRosterTable
							students={rosterQuery.data.data}
							onStudentClick={(student) => setDetailStudent(student)}
							onComplete={(student) => {
								completeMutation.reset();
								setCompletionStudent(student);
							}}
							completingEnrollmentId={
								completeMutation.isPending
									? completionStudent?.enrollmentId
									: undefined
							}
						/>
						<StudentRosterPagination
							page={rosterQuery.data.meta.page}
							totalPages={rosterQuery.data.meta.totalPages}
							hasPreviousPage={rosterQuery.data.meta.hasPreviousPage}
							hasNextPage={rosterQuery.data.meta.hasNextPage}
							onPrevious={() => setPage((value) => Math.max(1, value - 1))}
							onNext={() => setPage((value) => value + 1)}
						/>
					</>
				)}
			</section>

			{rosterQuery.data && (
				<p className="text-sm text-muted">
					Showing {rosterQuery.data.data.length} of{" "}
					{rosterQuery.data.meta.total} students.
				</p>
			)}

			<MarkCompletedDialog
				student={
					completionStudent?.status === "ACTIVE" ? completionStudent : null
				}
				busy={completeMutation.isPending}
				error={
					completeMutation.isError
						? getApiErrorMessage(
								completeMutation.error,
								"Unable to mark the student completed.",
							)
						: null
				}
				onClose={closeDialog}
				onConfirm={() => void confirmCompletion()}
			/>
		</main>
	);
}
