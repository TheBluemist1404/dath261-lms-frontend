import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePageView } from "@/features/workspace/components/workspace-page-view";

export const Route = createFileRoute("/_layout/workspace/$id/pages/$pageId")({
	component: RouteComponent,
});

function RouteComponent() {
	const { id, pageId } = Route.useParams();
	return <WorkspacePageView workspaceId={id} pageId={pageId} />;
}
