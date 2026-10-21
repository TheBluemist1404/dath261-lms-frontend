import { createFileRoute } from "@tanstack/react-router";
import { AdminGuard } from "@/features/admin/components/admin-guard";
import { AdminLayout } from "@/features/admin/components/admin-layout";

export const Route = createFileRoute("/admin")({
	component: AdminRoute,
});

function AdminRoute() {
	return (
		<AdminGuard>
			<AdminLayout />
		</AdminGuard>
	);
}
