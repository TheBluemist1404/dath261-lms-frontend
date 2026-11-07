import { createFileRoute } from "@tanstack/react-router";
import { CoursesPage } from "@/features/admin/components/courses-page";

export const Route = createFileRoute("/_layout/admin/courses")({
	component: CoursesPage,
});
