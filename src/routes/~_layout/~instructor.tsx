import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireRole } from "@/features/auth/routing/guards";

export const Route = createFileRoute("/_layout/instructor")({
	beforeLoad: requireRole(["lecturer"]),
	component: InstructorRoute,
});

function InstructorRoute() {
	return <Outlet />;
}
