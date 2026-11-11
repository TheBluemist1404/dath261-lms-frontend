import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import {
	useResumePosition,
	useStudentProgress,
} from "../api/enrollment.queries";
import type { MyCourseItemDto } from "../types/enrollment.types";

export interface MyCourseCardProps {
	item: MyCourseItemDto;
}

export function MyCourseCard({ item }: MyCourseCardProps) {
	const { course, state } = item;
	const isUnavailable = state === "UNAVAILABLE";
	const isCompleted = state === "COMPLETED";

	const { data: resumeData } = useResumePosition(item.courseId, {
		enabled: state === "IN_PROGRESS",
	});

	const { data: progressData } = useStudentProgress(item.courseId, {
		enabled: state === "IN_PROGRESS" || state === "COMPLETED",
	});

	const progressPercentage =
		state === "COMPLETED"
			? 100
			: (progressData?.progress?.learningProgressPercentage ?? 0);

	const resumeSearch =
		resumeData?.hasResumePosition && resumeData.block
			? {
					blockId: resumeData.block.id,
					positionSeconds: resumeData.resumeData?.data?.positionSeconds,
				}
			: undefined;

	return (
		<article className="flex flex-col justify-between rounded-2xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
			<div className="flex flex-col gap-3">
				<div className="flex items-center justify-between gap-2">
					<span className="truncate text-xs font-semibold uppercase tracking-wider text-muted">
						Course
					</span>
					{state === "IN_PROGRESS" && (
						<span className="rounded-full bg-primary-subtle px-2.5 py-0.5 text-xs font-semibold text-primary">
							In Progress
						</span>
					)}
					{state === "UNAVAILABLE" && (
						<span className="rounded-full bg-warning-subtle px-2.5 py-0.5 text-xs font-semibold text-warning">
							Unavailable
						</span>
					)}
					{state === "COMPLETED" && (
						<span className="rounded-full bg-success-subtle px-2.5 py-0.5 text-xs font-semibold text-success">
							Completed
						</span>
					)}
				</div>

				<h3 className="font-heading text-lg font-bold text-ink">
					<Link
						to="/courses/$courseId"
						params={{ courseId: item.courseId }}
						className="transition-colors hover:text-primary"
					>
						{course.title}
					</Link>
				</h3>

				<div className="flex flex-col gap-1.5 pt-2">
					<div className="flex items-center justify-between text-xs text-muted">
						{isUnavailable ? (
							<span>Progress preserved</span>
						) : isCompleted ? (
							<span>Completed</span>
						) : (
							<span>Progress</span>
						)}
						<span className="font-semibold text-ink">
							{progressPercentage}%
						</span>
					</div>
					<div className="h-2 w-full overflow-hidden rounded-full bg-subtle">
						<div
							className={`h-full transition-all ${
								isUnavailable
									? "bg-warning"
									: isCompleted
										? "bg-success"
										: "bg-primary"
							}`}
							style={{ width: `${Math.min(100, progressPercentage)}%` }}
						/>
					</div>
				</div>

				{isUnavailable && (
					<p className="rounded-lg bg-subtle p-2.5 text-xs text-muted">
						This course is temporarily unavailable. Your enrollment history and
						completed progress are safely preserved.
					</p>
				)}
			</div>

			<div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
				{state === "IN_PROGRESS" && (
					<>
						<Link
							to="/courses/$courseId/learn"
							params={{ courseId: item.courseId }}
							search={resumeSearch}
							className={buttonVariants({
								variant: "primary",
								size: "sm",
								className: "flex-1 justify-center",
							})}
						>
							Resume Learning
						</Link>
						<Link
							to="/courses/$courseId"
							params={{ courseId: item.courseId }}
							className={buttonVariants({
								variant: "outline",
								size: "sm",
								className: "justify-center",
							})}
						>
							Details
						</Link>
					</>
				)}

				{state === "UNAVAILABLE" && (
					<Link
						to="/courses/$courseId"
						params={{ courseId: item.courseId }}
						className={buttonVariants({
							variant: "secondary",
							size: "sm",
							className: "w-full justify-center",
						})}
					>
						View Details
					</Link>
				)}

				{state === "COMPLETED" && (
					<Link
						to="/courses/$courseId/learn"
						params={{ courseId: item.courseId }}
						className={buttonVariants({
							variant: "secondary",
							size: "sm",
							className: "w-full justify-center",
						})}
					>
						Review Course
					</Link>
				)}
			</div>
		</article>
	);
}
