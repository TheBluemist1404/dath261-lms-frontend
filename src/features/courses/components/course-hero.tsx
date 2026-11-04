import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/ui/icon";
import { type Course, isEnrollmentClosed } from "../types/course.types";

export interface CourseHeroProps {
	course: Course;
	totalBlocks?: number;
}

function getInitials(name: string): string {
	return name
		.trim()
		.split(/\s+/)
		.map((part) => part[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();
}

export function CourseHero({ course, totalBlocks = 0 }: CourseHeroProps) {
	const isClosed = isEnrollmentClosed(course);
	const isUpcoming =
		Boolean(course.enrollmentStartAt) &&
		new Date(course.enrollmentStartAt as string).getTime() > Date.now();

	const lecturerName = course.lecturer?.name || "Faculty Member";
	const lecturerInitials = getInitials(lecturerName) || "FM";

	return (
		<section className="flex flex-col gap-5 border-b border-border pb-8">
			<nav
				aria-label="Breadcrumb"
				className="flex items-center gap-2 text-sm text-muted"
			>
				<Link to="/catalog" className="transition-colors hover:text-primary">
					Catalog
				</Link>
				<Icon name="chevronRight" className="size-4" />
				<span className="max-w-xs truncate font-medium text-ink sm:max-w-md">
					{course.title}
				</span>
			</nav>

			<div className="flex flex-wrap items-center gap-2">
				{isClosed ? (
					<span className="rounded-full bg-subtle px-3 py-1 text-xs font-semibold text-muted">
						Enrollment Closed
					</span>
				) : isUpcoming ? (
					<span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning">
						Upcoming
					</span>
				) : (
					<span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
						Enrollment Open
					</span>
				)}
			</div>

			<h1 className="font-heading text-3xl font-bold tracking-tight text-ink sm:text-4xl">
				{course.title}
			</h1>

			{course.description ? (
				<p className="text-base leading-relaxed text-muted sm:text-lg">
					{course.description}
				</p>
			) : null}

			<div className="flex flex-wrap items-center justify-between gap-4 pt-2">
				<div className="flex items-center gap-3">
					<div
						aria-hidden="true"
						className="flex size-11 items-center justify-center rounded-full bg-primary-subtle font-heading text-sm font-bold text-primary"
					>
						{lecturerInitials}
					</div>
					<div className="flex flex-col">
						<span className="text-xs font-medium uppercase tracking-wider text-muted">
							Instructor
						</span>
						<span className="text-sm font-semibold text-ink">
							{lecturerName}
						</span>
						{course.lecturer?.email ? (
							<span className="text-xs text-muted">
								{course.lecturer.email}
							</span>
						) : null}
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-4 text-sm text-muted">
					{totalBlocks > 0 ? (
						<div className="flex items-center gap-1.5">
							<Icon name="book" className="size-4 text-primary" />
							<span>{totalBlocks} learning items</span>
						</div>
					) : null}
					{typeof course.enrollmentCount === "number" ? (
						<div className="flex items-center gap-1.5">
							<Icon name="users" className="size-4 text-primary" />
							<span>{course.enrollmentCount} learners</span>
						</div>
					) : null}
				</div>
			</div>
		</section>
	);
}
