import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceSettingsPage } from "@/features/workspace/components/workspace-settings-page";

export const Route = createFileRoute("/_layout/workspace/$id/settings")({
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	return <WorkspaceSettingsPage workspaceId={id} />;
}
