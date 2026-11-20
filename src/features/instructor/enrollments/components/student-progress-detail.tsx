import { Link } from "@tanstack/react-router";
import { useStudentProgress } from "../api/instructor-enrollment.queries";
import type { LecturerStudentProgress } from "../types/instructor-enrollment.types";

interface StudentProgressDetailProps {
	courseId: string;
	enrollmentId: string;
	onBack?: () => void;
}

function formatDate(value: string | null) {
	if (!value) return "—";
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}

function studentName(
	firstName: string | null,
	lastName: string | null,
	email: string,
) {
	const name = [firstName, lastName].filter(Boolean).join(" ").trim();
	return name || email;
}

export function StudentProgressDetail({
	courseId,
	enrollmentId,
	onBack,
}: StudentProgressDetailProps) {
	const query = useStudentProgress(courseId, enrollmentId);

	if (query.isPending) {
		return (
			<section className="rounded-xl border border-border bg-white p-8 text-center">
				<p className="text-sm text-muted">Loading student progress…</p>
			</section>
		);
	}

	if (query.isError) {
		return (
			<section
				className="rounded-xl border border-border bg-white p-6"
				role="alert"
			>
				<p className="text-sm text-error">
					Unable to load student progress: {query.error.message}
				</p>
				<button
					type="button"
					className="mt-3 min-h-10 rounded-lg border border-border px-3 text-sm font-semibold"
					onClick={() => void query.refetch()}
				>
					Retry
				</button>
				{onBack && (
					<button
						type="button"
						className="ml-2 min-h-10 rounded-lg border border-border px-3 text-sm font-semibold"
						onClick={onBack}
					>
						Back to students
					</button>
				)}
			</section>
		);
	}

	const data: LecturerStudentProgress = query.data;

	return (
		<main className="flex flex-col gap-6">
			<div>
				{onBack ? (
					<button
						type="button"
						onClick={onBack}
						className="text-sm font-semibold text-primary hover:underline"
					>
						← Back to students
					</button>
				) : (
					<Link
						to="/instructor/courses/$courseId/students"
						params={{ courseId }}
						className="text-sm font-semibold text-primary hover:underline"
					>
						← Back to students
					</Link>
				)}
				<p className="mt-4 text-sm font-semibold uppercase tracking-wide text-primary">
					Student progress
				</p>
				<h1 className="mt-1 font-heading text-3xl font-bold tracking-tight">
					{studentName(
						data.student.firstName,
						data.student.lastName,
						data.student.email,
					)}
				</h1>
				<p className="mt-1 text-sm text-muted">{data.student.email}</p>
			</div>

			<section className="grid gap-4 sm:grid-cols-4">
				<MetricCard label="Status" value={data.enrollment.status} />
				<MetricCard
					label="Learning progress"
					value={`${data.progress.learningProgressPercentage}%`}
				/>
				<MetricCard
					label="Completed blocks"
					value={`${data.progress.completedItems}/${data.progress.totalItems}`}
				/>
				<MetricCard
					label="Quiz completion"
					value={`${data.progress.quizCompletionPercentage}%`}
				/>
			</section>

			<section className="rounded-xl border border-border bg-white p-5">
				<h2 className="font-heading text-xl font-bold">Learning blocks</h2>
				<p className="mt-1 text-sm text-muted">
					Completion status for every tracked block in the course.
				</p>

				<div className="mt-4 divide-y divide-border">
					{data.items.length === 0 ? (
						<p className="py-5 text-sm text-muted">No tracked blocks.</p>
					) : (
						data.items.map((item: LecturerStudentProgress["items"][number]) => (
							<div
								key={item.courseBlockId}
								className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
							>
								<div>
									<p className="font-semibold">{item.title}</p>
									<p className="text-xs text-muted">
										{item.type} · Position {item.position}
									</p>
								</div>
								<div className="text-sm">
									<span
										className={
											item.completed
												? "font-semibold text-primary"
												: "text-muted"
										}
									>
										{item.completed ? "Completed" : "Not completed"}
									</span>
									{item.completedAt && (
										<span className="ml-2 text-xs text-muted">
											{formatDate(item.completedAt)}
										</span>
									)}
								</div>
							</div>
						))
					)}
				</div>
			</section>

			<section className="rounded-xl border border-border bg-white p-5">
				<h2 className="font-heading text-xl font-bold">Quiz attempts</h2>
				<div className="mt-4 overflow-x-auto">
					{data.quizAttempts.length === 0 ? (
						<p className="py-2 text-sm text-muted">No quiz attempts.</p>
					) : (
						<table className="w-full min-w-[620px] border-collapse text-left text-sm">
							<thead className="bg-subtle text-xs font-semibold uppercase text-muted">
								<tr>
									<th className="px-3 py-2">Quiz</th>
									<th className="px-3 py-2">Attempt</th>
									<th className="px-3 py-2">Status</th>
									<th className="px-3 py-2">Score</th>
									<th className="px-3 py-2">Submitted</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{data.quizAttempts.map(
									(
										attempt: LecturerStudentProgress["quizAttempts"][number],
									) => (
										<tr key={attempt.id}>
											<td className="px-3 py-3">{attempt.quizBlock.title}</td>
											<td className="px-3 py-3">{attempt.attemptNumber}</td>
											<td className="px-3 py-3">{attempt.status}</td>
											<td className="px-3 py-3">{attempt.score ?? "—"}</td>
											<td className="px-3 py-3">
												{formatDate(attempt.submittedAt)}
											</td>
										</tr>
									),
								)}
							</tbody>
						</table>
					)}
				</div>
			</section>

			<section className="rounded-xl border border-border bg-white p-5">
				<h2 className="font-heading text-xl font-bold">
					Assignment submissions
				</h2>
				<div className="mt-4 overflow-x-auto">
					{data.assignmentSubmissions.length === 0 ? (
						<p className="py-2 text-sm text-muted">
							No assignment submissions.
						</p>
					) : (
						<table className="w-full min-w-[700px] border-collapse text-left text-sm">
							<thead className="bg-subtle text-xs font-semibold uppercase text-muted">
								<tr>
									<th className="px-3 py-2">Assignment</th>
									<th className="px-3 py-2">Attempt</th>
									<th className="px-3 py-2">Status</th>
									<th className="px-3 py-2">Score</th>
									<th className="px-3 py-2">Submitted</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{data.assignmentSubmissions.map(
									(
										submission: LecturerStudentProgress["assignmentSubmissions"][number],
									) => (
										<tr key={submission.id}>
											<td className="px-3 py-3">
												{submission.assignmentBlock.title}
											</td>
											<td className="px-3 py-3">{submission.attemptNumber}</td>
											<td className="px-3 py-3">{submission.status}</td>
											<td className="px-3 py-3">{submission.score ?? "—"}</td>
											<td className="px-3 py-3">
												{formatDate(submission.submittedAt)}
											</td>
										</tr>
									),
								)}
							</tbody>
						</table>
					)}
				</div>
			</section>
		</main>
	);
}

function MetricCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl border border-border bg-white p-4">
			<p className="text-xs font-semibold uppercase tracking-wide text-muted">
				{label}
			</p>
			<p className="mt-2 font-heading text-2xl font-bold">{value}</p>
		</div>
	);
}
