import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_layout/_authenticated/dashboard")({
	component: DashboardPage,
});

function DashboardPage() {
	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
			<p className="text-muted">Welcome to your learning workspace.</p>
		</div>
	);
}
