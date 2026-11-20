import type { EnrollmentRosterItem } from "../types/instructor-enrollment.types";

interface StudentRosterTableProps {
	students: EnrollmentRosterItem[];
	onStudentClick: (student: EnrollmentRosterItem) => void;
	onComplete: (student: EnrollmentRosterItem) => void;
	completingEnrollmentId?: string;
}

function studentName(item: EnrollmentRosterItem) {
	const name = [item.student.firstName, item.student.lastName]
		.filter(Boolean)
		.join(" ")
		.trim();
	return name || item.student.email;
}

function formatScore(score: number | null) {
	return score === null ? "—" : score.toFixed(2);
}

export function StudentRosterTable({
	students,
	onStudentClick,
	onComplete,
	completingEnrollmentId,
}: StudentRosterTableProps) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[780px] border-collapse text-left">
				<thead className="bg-subtle text-xs font-semibold uppercase tracking-wide text-muted">
					<tr>
						<th scope="col" className="px-5 py-3">
							Student
						</th>
						<th scope="col" className="px-4 py-3">
							Status
						</th>
						<th scope="col" className="px-4 py-3">
							Progress
						</th>
						<th scope="col" className="px-4 py-3">
							Quiz score
						</th>
						<th scope="col" className="px-5 py-3">
							<span className="sr-only">Actions</span>
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-border">
					{students.map((item) => (
						<tr
							key={item.enrollmentId}
							className="align-middle hover:bg-canvas/60"
						>
							<td className="px-5 py-4">
								<button
									type="button"
									className="text-left"
									onClick={() => onStudentClick(item)}
								>
									<span className="font-semibold text-primary hover:underline">
										{studentName(item)}
									</span>
									<span className="mt-1 block text-sm text-muted">
										{item.student.email}
									</span>
								</button>
							</td>
							<td className="px-4 py-4">
								<span className="inline-flex rounded-full bg-subtle px-2.5 py-1 text-xs font-semibold">
									{item.status}
								</span>
							</td>
							<td className="px-4 py-4">
								<div className="min-w-36">
									<div className="mb-1 flex justify-between text-xs">
										<span className="text-muted">
											{item.progress.completedBlocks}/
											{item.progress.totalBlocks} blocks
										</span>
										<span className="font-semibold">
											{item.progress.percent}%
										</span>
									</div>
									<div
										className="h-2 overflow-hidden rounded-full bg-subtle"
										role="progressbar"
										aria-label={`${studentName(item)} progress`}
										aria-valuemin={0}
										aria-valuemax={100}
										aria-valuenow={item.progress.percent}
									>
										<div
											className="h-full rounded-full bg-primary"
											style={{
												width: `${Math.min(100, Math.max(0, item.progress.percent))}%`,
											}}
										/>
									</div>
								</div>
							</td>
							<td className="px-4 py-4 text-sm">
								{formatScore(item.quizScore)}
							</td>
							<td className="px-5 py-4">
								<div className="flex justify-end">
									{item.status === "ACTIVE" ? (
										<button
											type="button"
											className="min-h-9 rounded-lg bg-primary px-3 text-sm font-semibold text-white disabled:opacity-50"
											disabled={completingEnrollmentId === item.enrollmentId}
											onClick={() => onComplete(item)}
										>
											{completingEnrollmentId === item.enrollmentId
												? "Completing…"
												: "Mark completed"}
										</button>
									) : (
										<span className="text-sm text-muted">
											{item.status === "COMPLETED" ? "Completed" : "Not active"}
										</span>
									)}
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
