import { Link } from "@tanstack/react-router";
import { twMerge } from "tailwind-merge";
import { buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
	useResumePosition,
	useStudentProgress,
} from "@/features/courses/api/enrollment.queries";
import type { MyCourseItemDto } from "@/features/courses/types/enrollment.types";
import { buildCourseResumeSearch } from "@/features/courses/utils/resume-link";

export interface ContinueLearningCardProps {
	course: MyCourseItemDto;
	className?: string;
}

export function ContinueLearningCard({
	course,
	className,
}: ContinueLearningCardProps) {
	const { data: resumeData } = useResumePosition(course.courseId);
	const { data: progressData } = useStudentProgress(course.courseId);

	const resumeBlock =
		resumeData?.hasResumePosition && resumeData.block ? resumeData.block : null;
	const resumeSearch = buildCourseResumeSearch(resumeData);
	const progressPercentage = Math.min(
		100,
		Math.max(
			0,
			Math.round(progressData?.progress?.learningProgressPercentage ?? 0),
		),
	);

	return (
		<section
			aria-labelledby="continue-learning-heading"
			className={twMerge(
				"min-w-0 rounded-2xl bg-primary-subtle p-6 sm:p-8",
				className,
			)}
		>
			<p
				id="continue-learning-heading"
				className="text-xs font-semibold uppercase tracking-wider text-primary"
			>
				Continue learning
			</p>

			<div className="mt-3">
				<span className="inline-flex max-w-full items-center rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-primary break-words">
					{course.course.title}
				</span>
			</div>

			<h2 className="mt-3 font-heading text-2xl font-bold tracking-tight text-ink break-words sm:text-3xl">
				{resumeBlock ? resumeBlock.title : course.course.title}
			</h2>
			<p className="mt-1.5 text-sm text-muted break-words">
				{resumeBlock ? course.course.title : "Pick up where you left off."}
			</p>

			<div className="mt-6 space-y-2">
				<div className="flex items-center justify-between gap-2 text-xs">
					<span className="font-medium text-muted">Learning progress</span>
					<span className="font-semibold text-ink">{progressPercentage}%</span>
				</div>
				<div
					role="progressbar"
					aria-label={`Learning progress for ${course.course.title}`}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={progressPercentage}
					className="h-2 w-full overflow-hidden rounded-full bg-white"
				>
					<div
						className="h-full rounded-full bg-primary transition-all"
						style={{ width: `${progressPercentage}%` }}
					/>
				</div>
			</div>

			<div className="mt-6 flex flex-wrap items-center gap-3">
				<Link
					to="/courses/$courseId/learn"
					params={{ courseId: course.courseId }}
					search={resumeSearch}
					className={buttonVariants({ variant: "primary", size: "md" })}
				>
					<Icon name="play" className="size-4" />
					Resume learning
				</Link>
				<Link
					to="/workspace"
					className={buttonVariants({
						variant: "secondary",
						size: "md",
						className:
							"border-transparent bg-canvas text-primary hover:bg-white",
					})}
				>
					Study notes
				</Link>
			</div>
		</section>
	);
}
