import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/courses/$courseId")({
	component: CourseDetailPlaceholder,
});

function CourseDetailPlaceholder() {
	return (
		<div className="mx-auto max-w-4xl p-8">
			<h1 className="font-heading text-2xl font-bold">Course Details</h1>
			<p className="mt-2 text-muted">
				Public preview for this course is being prepared.
			</p>
		</div>
	);
}
