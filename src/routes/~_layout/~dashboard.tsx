import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/features/auth/routing/guards";
import { StudentDashboardView } from "@/features/dashboard/components/student-dashboard-view";

export const Route = createFileRoute("/_layout/dashboard")({
	beforeLoad: requireRole(["student"]),
	component: StudentDashboardView,
});
