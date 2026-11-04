import type { Course } from "../types/course.types";
import { CourseCard } from "./course-card";

export interface CourseGridProps {
	courses?: Course[];
	isLoading?: boolean;
}

const SKELETON_SLOTS = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"];

export function CourseGrid({
	courses = [],
	isLoading = false,
}: CourseGridProps) {
	if (isLoading) {
		return (
			<section
				aria-label="Loading courses"
				className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
			>
				{SKELETON_SLOTS.map((slotKey) => (
					<div
						key={slotKey}
						className="flex h-[260px] animate-pulse flex-col justify-between rounded-2xl border border-border bg-subtle p-5"
					>
						<div className="flex flex-col gap-3">
							<div className="h-5 w-24 rounded-full bg-border" />
							<div className="h-6 w-3/4 rounded bg-border" />
							<div className="h-4 w-full rounded bg-border" />
							<div className="h-4 w-2/3 rounded bg-border" />
						</div>
						<div className="flex items-center justify-between border-t border-border pt-4">
							<div className="h-4 w-28 rounded bg-border" />
							<div className="h-4 w-16 rounded bg-border" />
						</div>
					</div>
				))}
			</section>
		);
	}

	return (
		<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{courses.map((course) => (
				<CourseCard key={course.id} course={course} />
			))}
		</div>
	);
}
