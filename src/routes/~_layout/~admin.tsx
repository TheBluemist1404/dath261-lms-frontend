import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireRole } from "@/features/auth/routing/guards";

export const Route = createFileRoute("/_layout/admin")({
	beforeLoad: requireRole(["admin"]),
	component: AdminRoute,
});

function AdminRoute() {
	return <Outlet />;
}
