import { createFileRoute } from "@tanstack/react-router";
import CourseManagementPage from "@/features/courses/components/course-management-page";

export const Route = createFileRoute("/_layout/instructor/courses/")({
	component: CourseManagementPage,
});
