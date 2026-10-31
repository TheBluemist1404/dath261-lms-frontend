import { createFileRoute } from "@tanstack/react-router";
import CourseDetailPage from "@/features/courses/components/course-detail-page";

export const Route = createFileRoute("/_layout/instructor/courses/$courseId")({
	component: CourseDetailPage,
});
