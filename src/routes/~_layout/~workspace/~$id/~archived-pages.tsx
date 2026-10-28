import { createFileRoute } from "@tanstack/react-router";
import { ArchivedPagesPage } from "@/features/workspace/components/archived-pages-page";

export const Route = createFileRoute("/_layout/workspace/$id/archived-pages")({
	component: RouteComponent,
});

function RouteComponent() {
	const { id } = Route.useParams();
	return <ArchivedPagesPage workspaceId={id} />;
}
