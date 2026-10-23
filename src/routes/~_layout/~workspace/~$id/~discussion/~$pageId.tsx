import { createFileRoute } from "@tanstack/react-router";
import { PageDiscussion } from "@/features/workspace/components/page-discussion";

export const Route = createFileRoute(
	"/_layout/workspace/$id/discussion/$pageId",
)({
	validateSearch: (search: Record<string, unknown>): { passage?: string } =>
		typeof search.passage === "string" && search.passage
			? { passage: search.passage }
			: {},
	component: RouteComponent,
});

function RouteComponent() {
	const { id, pageId } = Route.useParams();
	const { passage } = Route.useSearch();
	return <PageDiscussion workspaceId={id} pageId={pageId} passage={passage} />;
}
