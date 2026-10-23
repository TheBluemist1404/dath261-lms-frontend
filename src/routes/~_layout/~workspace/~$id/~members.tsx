import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceMembersPage } from "@/features/workspace/components/workspace-members-page";

export const Route = createFileRoute("/_layout/workspace/$id/members")({
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	return <WorkspaceMembersPage workspaceId={id} />;
}
