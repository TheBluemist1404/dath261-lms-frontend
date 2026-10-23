import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceOverviewPage } from "@/features/workspace/components/workspace-overview-page";

export const Route = createFileRoute("/_layout/workspace/$id/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	return <WorkspaceOverviewPage workspaceId={id} />;
}
