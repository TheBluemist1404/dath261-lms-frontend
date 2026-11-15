export interface CourseObjectivesProps {
	description?: string | null;
}

export function CourseObjectives({ description }: CourseObjectivesProps) {
	if (!description?.trim()) return null;

	return (
		<section
			aria-labelledby="course-objectives-heading"
			className="rounded-2xl border border-border bg-white p-6"
		>
			<h2
				id="course-objectives-heading"
				className="font-heading text-lg font-bold text-ink"
			>
				About this course
			</h2>
			<p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
		</section>
	);
}
