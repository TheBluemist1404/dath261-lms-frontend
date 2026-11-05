import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/http/errors";
import { courseBlocksQuery, courseDetailQuery } from "../api/course.queries";
import { CourseActionSidebar } from "./course-action-sidebar";
import { CourseHero } from "./course-hero";
import { CourseNotFoundState } from "./course-not-found-state";
import { CourseObjectives } from "./course-objectives";
import { CoursePrerequisites } from "./course-prerequisites";
import { CourseSyllabusAccordion } from "./course-syllabus-accordion";

export interface CourseDetailViewProps {
	courseId: string;
}

export function CourseDetailView({ courseId }: CourseDetailViewProps) {
	const courseQuery = useQuery(courseDetailQuery(courseId));
	const blocksQuery = useQuery(courseBlocksQuery(courseId));

	if (courseQuery.isLoading) {
		return (
			<main
				aria-label="Loading course details"
				className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
			>
				<div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
					<div className="flex animate-pulse flex-col gap-6 lg:col-span-8">
						<div className="h-5 w-40 rounded bg-border" />
						<div className="h-10 w-3/4 rounded bg-border" />
						<div className="h-20 w-full rounded-2xl bg-subtle" />
						<div className="h-40 w-full rounded-2xl bg-subtle" />
						<div className="h-60 w-full rounded-2xl bg-subtle" />
					</div>
					<div className="lg:col-span-4">
						<div className="h-80 w-full animate-pulse rounded-2xl bg-subtle" />
					</div>
				</div>
			</main>
		);
	}

	const errorStatus = getApiErrorStatus(courseQuery.error);
	const course = courseQuery.data;

	if (
		errorStatus === 404 ||
		errorStatus === 403 ||
		(course && course.status === "DRAFT")
	) {
		return <CourseNotFoundState />;
	}

	if (courseQuery.isError || !course) {
		const message = getApiErrorMessage(
			courseQuery.error,
			"Unable to load course details. Please try again.",
		);
		return (
			<main className="mx-auto max-w-2xl px-4 py-16 text-center">
				<div className="rounded-2xl border border-error/20 bg-error/5 p-6">
					<div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-error/10 text-error">
						<Icon name="alertCircle" className="size-6" />
					</div>
					<h1 className="mt-4 font-heading text-lg font-bold text-ink">
						Failed to load course
					</h1>
					<p className="mt-2 text-sm text-muted">{message}</p>
					<div className="mt-6 flex justify-center">
						<Button
							variant="primary"
							onClick={() => {
								courseQuery.refetch();
								blocksQuery.refetch();
							}}
						>
							Retry
						</Button>
					</div>
				</div>
			</main>
		);
	}

	const blocks = blocksQuery.data ?? [];

	return (
		<main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			<div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
				<div className="flex flex-col gap-8 lg:col-span-8">
					<CourseHero course={course} totalBlocks={blocks.length} />
					<CourseObjectives description={course.description} />
					<CoursePrerequisites prerequisites={course.prerequisites} />
					<CourseSyllabusAccordion blocks={blocks} />
				</div>
				<div className="lg:col-span-4">
					<CourseActionSidebar course={course} />
				</div>
			</div>
		</main>
	);
}
