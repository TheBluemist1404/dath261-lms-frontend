import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceHomePage } from "@/features/workspace/screens/workspace-home-page";

export const Route = createFileRoute("/_layout/workspace/$id/")({
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	return <WorkspaceHomePage workspaceId={id} />;
}
