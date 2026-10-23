import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceSearchPage } from "@/features/workspace/components/workspace-search-page";

export const Route = createFileRoute("/_layout/workspace/search")({
	validateSearch: (search: Record<string, unknown>): { q?: string } =>
		typeof search.q === "string" && search.q ? { q: search.q } : {},
	component: RouteComponent,
});

function RouteComponent() {
	const { q = "" } = Route.useSearch();
	return <WorkspaceSearchPage query={q} />;
}
