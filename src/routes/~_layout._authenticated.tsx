import { createFileRoute, Outlet } from "@tanstack/react-router";
import { requireAuth } from "@/features/auth/routing/guards";

export const Route = createFileRoute("/_layout/_authenticated")({
	beforeLoad: ({ context, location }) => {
		return requireAuth({ context, location });
	},
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	return <Outlet />;
}
