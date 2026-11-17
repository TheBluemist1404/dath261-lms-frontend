import { Link } from "@tanstack/react-router";
import { Icon } from "@/components/ui/icon";
import { type Course, isEnrollmentClosed } from "../types/course.types";

export interface CourseCardProps {
	course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
	const isClosed = isEnrollmentClosed(course);

	return (
		<Link
			to="/courses/$courseId"
			params={{ courseId: course.id }}
			className="group flex flex-col justify-between rounded-2xl border border-border bg-white p-5 transition-all hover:border-primary hover:shadow-sm"
		>
			<div className="flex flex-col gap-3">
				<div className="flex items-center justify-end gap-2">
					{isClosed ? (
						<span className="rounded-full bg-warning-subtle px-2.5 py-1 text-xs font-semibold text-warning">
							Closed
						</span>
					) : (
						<span className="rounded-full bg-success-subtle px-2.5 py-1 text-xs font-semibold text-success">
							Open
						</span>
					)}
				</div>

				<div className="flex flex-col gap-1.5">
					<h3 className="font-heading text-lg font-bold text-ink transition-colors group-hover:text-primary line-clamp-2">
						{course.title}
					</h3>
					<p className="text-sm leading-relaxed text-muted line-clamp-2">
						{course.description ||
							"Comprehensive university course curriculum and study materials."}
					</p>
				</div>
			</div>

			<div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted">
				<div className="flex items-center gap-1.5 font-medium text-ink">
					<Icon name="users" className="size-4 text-muted" />
					<span className="truncate max-w-[150px]">
						{course.lecturer?.name || "Faculty Lecturer"}
					</span>
				</div>
				<span className="rounded-md bg-subtle px-2 py-0.5 font-medium">
					Self-paced
				</span>
			</div>
		</Link>
	);
}
