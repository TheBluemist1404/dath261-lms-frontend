import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminGuard } from "@/features/admin/components/admin-guard";

export const Route = createFileRoute("/_layout/admin")({
	component: AdminRoute,
});

function AdminRoute() {
	return (
		<AdminGuard>
			<Outlet />
		</AdminGuard>
	);
}
