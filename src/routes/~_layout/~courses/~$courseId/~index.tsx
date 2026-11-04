import { createFileRoute } from "@tanstack/react-router";
import { CourseDetailView } from "@/features/courses/components/course-detail-view";

export const Route = createFileRoute("/_layout/courses/$courseId/")({
	component: CourseDetailRouteComponent,
});

function CourseDetailRouteComponent() {
	const { courseId } = Route.useParams();
	return <CourseDetailView courseId={courseId} />;
}
