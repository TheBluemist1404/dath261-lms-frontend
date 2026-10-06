import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceLandingPage } from "@/features/workspace/components/workspace-landing-page";
import { previewWorkspaces } from "@/features/workspace/workspace-preview-data";

export const Route = createFileRoute("/_layout/workspace/")({
	// Temporary preview selector until workspace data comes from the API.
	validateSearch: (search: Record<string, unknown>) => {
		if (search.preview === "empty") return { preview: "empty" as const };
		return {};
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { preview } = Route.useSearch();
	return (
		<WorkspaceLandingPage
			key={preview ?? "populated"}
			initialWorkspaces={preview === "empty" ? [] : previewWorkspaces}
		/>
	);
}
