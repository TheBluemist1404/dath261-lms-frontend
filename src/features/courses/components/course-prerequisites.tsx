import { Icon } from "@/components/ui/icon";

export interface CoursePrerequisitesProps {
	prerequisites: string | null;
}

export function CoursePrerequisites({
	prerequisites,
}: CoursePrerequisitesProps) {
	const trimmed = prerequisites?.trim();

	return (
		<section
			aria-labelledby="course-prerequisites-heading"
			className="rounded-2xl border border-border bg-subtle p-6"
		>
			<div className="flex items-center gap-2.5">
				<Icon name="checkCircle" className="size-5 text-primary" />
				<h2
					id="course-prerequisites-heading"
					className="font-heading text-lg font-bold text-ink"
				>
					Prerequisites & Preparation
				</h2>
			</div>

			<div className="mt-3 text-sm leading-relaxed text-muted">
				{trimmed ? (
					<div className="flex flex-col gap-2">
						<p className="text-ink">{trimmed}</p>
						<p className="text-xs text-muted">
							Review these prerequisites to ensure you have the recommended
							foundations before enrolling.
						</p>
					</div>
				) : (
					<p>
						No prior prerequisites are required for this course. Beginners and
						learners of all backgrounds are welcome to participate.
					</p>
				)}
			</div>
		</section>
	);
}
