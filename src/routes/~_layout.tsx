import { createFileRoute, Outlet } from "@tanstack/react-router";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";

export const Route = createFileRoute("/_layout")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="min-h-dvh bg-canvas text-ink">
			<Header />
			<div className="flex min-w-0">
				<Sidebar />
				<main className="min-w-0 flex-1 px-5 py-8 sm:px-8">
					<Outlet />
				</main>
			</div>
		</div>
	);
}
